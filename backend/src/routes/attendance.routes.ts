import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireRoles, type AuthedRequest } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { generateNumericPin, hashToken } from "../lib/password.js";
import { parsePagination, sendList, getTrainerProfileId, getClientProfileId } from "./helpers.js";
import { randomUUID } from "crypto";
import { writeAudit } from "../services/audit.service.js";
import QRCode from "qrcode";
import { paramId } from "./params.js";
import { syncClientSessionsCompletedFromLedger } from "../services/attendance-sync.service.js";

export function attendanceRouter(env: Env) {
  const r = Router();
  r.use(authMiddleware(env));

  r.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
      const clientId = req.query.clientId ? String(req.query.clientId) : undefined;

      let where: Prisma.AttendanceRecordWhereInput = {};

      if (req.user!.role === "ADMIN") {
        if (clientId) where = { ...where, clientId };
      } else if (req.user!.role === "TRAINER") {
        const tid = await getTrainerProfileId(req.user!.id);
        where = { ...where, trainerId: tid, ...(clientId ? { clientId } : {}) };
      } else {
        const cid = await getClientProfileId(req.user!.id);
        where = { ...where, clientId: cid };
      }

      const [rows, total] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where,
          skip,
          take,
          orderBy: [{ sessionDate: "desc" }, { startedAt: "desc" }],
          include: {
            client: { include: { user: { select: { firstName: true, lastName: true } } } },
            trainer: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        }),
        prisma.attendanceRecord.count({ where }),
      ]);

      sendList(res, rows, total, page, pageSize);
    }),
  );

  r.get(
    "/analytics",
    asyncHandler(async (req: AuthedRequest, res) => {
      let where: Prisma.AttendanceRecordWhereInput = {};

      if (req.user!.role === "CLIENT") {
        const cid = await getClientProfileId(req.user!.id);
        where = { clientId: cid };
      } else if (req.user!.role === "TRAINER") {
        const tid = await getTrainerProfileId(req.user!.id);
        const clients = await prisma.profileClient.findMany({
          where: { trainerId: tid },
          select: { id: true },
        });
        const ids = clients.map((c) => c.id);
        if (ids.length === 0) {
          return res.json({
            totalSessions: 0,
            completedSessions: 0,
            attendanceRatePercent: 0,
            clientMissed: 0,
            trainerMissed: 0,
          });
        }
        where = { clientId: { in: ids } };
      } else if (req.query.clientId) {
        where = { clientId: String(req.query.clientId) };
      }

      const [total, completed, clientAbsent, trainerAbsent] = await Promise.all([
        prisma.attendanceRecord.count({ where }),
        prisma.attendanceRecord.count({ where: { ...where, sessionCompleted: true } }),
        prisma.attendanceRecord.count({ where: { ...where, clientStatus: "ABSENT" } }),
        prisma.attendanceRecord.count({ where: { ...where, trainerStatus: "ABSENT" } }),
      ]);

      const attendancePct = total === 0 ? 0 : Math.round((completed / total) * 100);
      res.json({
        totalSessions: total,
        completedSessions: completed,
        attendanceRatePercent: attendancePct,
        clientMissed: clientAbsent,
        trainerMissed: trainerAbsent,
      });
    }),
  );

  const startSchema = z.object({
    clientId: z.string().uuid(),
    trainerStatus: z.enum(["PRESENT", "ABSENT", "RESCHEDULED"]).default("PRESENT"),
    notes: z.string().optional(),
  });

  r.post(
    "/sessions/start",
    requireRoles("TRAINER"),
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = startSchema.parse(req.body);
      const trainerId = await getTrainerProfileId(req.user!.id);
      const client = await prisma.profileClient.findFirst({
        where: { id: body.clientId, trainerId },
      });
      if (!client) throw new AppError(403, "Client not assigned to you");

      const pendingOpen = await prisma.attendanceRecord.findFirst({
        where: {
          clientId: client.id,
          clientStatus: "PENDING",
          expiresAt: { gt: new Date() },
        },
      });
      if (pendingOpen) {
        throw new AppError(
          409,
          "This client already has an active check-in (PIN not used yet or not expired). Wait for them to verify, or wait for the PIN to expire, before starting another session.",
        );
      }

      const sessionDate = new Date();
      sessionDate.setHours(0, 0, 0, 0);

      const pin = generateNumericPin(6);
      const pinHash = hashToken(pin);
      const verifyToken = randomUUID();
      const expiresAt = new Date(Date.now() + env.ATTENDANCE_PIN_EXPIRY_MINUTES * 60 * 1000);

      const record = await prisma.attendanceRecord.create({
        data: {
          clientId: client.id,
          trainerId,
          sessionDate,
          pinHash,
          verifyToken,
          expiresAt,
          trainerStatus: body.trainerStatus,
          trainerCheckedAt: new Date(),
          notes: body.notes,
        },
      });

      const verifyUrl = `${env.FRONTEND_URL}/client/verify-attendance?token=${verifyToken}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });

      await writeAudit({
        actorId: req.user!.id,
        entity: "AttendanceRecord",
        entityId: record.id,
        action: "START_SESSION",
        newValue: { clientId: client.id, sessionDate },
      });

      res.status(201).json({
        attendanceId: record.id,
        pin,
        verifyToken,
        verifyUrl,
        qrDataUrl,
        expiresAt,
      });
    }),
  );

  const verifyPinSchema = z.object({
    pin: z.string().min(1),
  });

  r.post(
    "/sessions/verify-pin",
    requireRoles("CLIENT"),
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = verifyPinSchema.parse(req.body);
      const clientId = await getClientProfileId(req.user!.id);
      const digits = body.pin.replace(/\D/g, "");
      if (digits.length !== 6) throw new AppError(400, "PIN must be 6 digits");
      const pinHash = hashToken(digits);

      const record = await prisma.attendanceRecord.findFirst({
        where: {
          clientId,
          pinHash,
          expiresAt: { gt: new Date() },
          clientStatus: "PENDING",
        },
        orderBy: { startedAt: "desc" },
      });

      if (!record) {
        const anyPinMatch = await prisma.attendanceRecord.findFirst({
          where: { clientId, pinHash },
          orderBy: { startedAt: "desc" },
        });
        if (anyPinMatch) {
          if (anyPinMatch.clientStatus !== "PENDING") {
            throw new AppError(
              400,
              "This PIN was already used. If you opened the verification link first, that counts as check-in — ask your coach for a new session PIN if you still need to verify.",
            );
          }
          if (anyPinMatch.expiresAt <= new Date()) {
            throw new AppError(400, "This PIN has expired. Ask your coach to generate a new check-in.");
          }
        }
        throw new AppError(400, "Invalid PIN. Confirm the digits with your coach, or use the verification link they shared.");
      }

      const trainerPresent = record.trainerStatus === "PRESENT";
      const updatedRows = await prisma.attendanceRecord.updateMany({
        where: {
          id: record.id,
          clientId,
          clientStatus: "PENDING",
          pinHash,
          expiresAt: { gt: new Date() },
        },
        data: {
          clientStatus: "PRESENT",
          clientVerifiedAt: new Date(),
          sessionCompleted: trainerPresent,
        },
      });

      if (updatedRows.count === 0) {
        const existing = await prisma.attendanceRecord.findUnique({ where: { id: record.id } });
        if (existing && existing.clientStatus !== "PENDING") {
          return res.json(existing);
        }
        throw new AppError(400, "Invalid or expired PIN");
      }

      const updated = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: record.id } });

      if (updated.sessionCompleted) {
        await syncClientSessionsCompletedFromLedger(clientId);
      }

      await writeAudit({
        actorId: req.user!.id,
        entity: "AttendanceRecord",
        entityId: record.id,
        action: "CLIENT_VERIFY_PIN",
      });

      res.json(updated);
    }),
  );

  const verifyTokenSchema = z.object({
    token: z.string().uuid(),
  });

  r.post(
    "/sessions/verify-token",
    asyncHandler(async (req: AuthedRequest, res) => {
      if (!req.user || req.user.role !== "CLIENT") {
        throw new AppError(401, "Clients only");
      }
      const body = verifyTokenSchema.parse(req.body);
      const clientId = await getClientProfileId(req.user.id);

      const record = await prisma.attendanceRecord.findFirst({
        where: {
          verifyToken: body.token,
          clientId,
          expiresAt: { gt: new Date() },
          clientStatus: "PENDING",
        },
      });

      if (!record) throw new AppError(400, "Invalid or expired session");

      const trainerPresent = record.trainerStatus === "PRESENT";
      const updatedRows = await prisma.attendanceRecord.updateMany({
        where: {
          id: record.id,
          clientId,
          clientStatus: "PENDING",
          verifyToken: body.token,
          expiresAt: { gt: new Date() },
        },
        data: {
          clientStatus: "PRESENT",
          clientVerifiedAt: new Date(),
          sessionCompleted: trainerPresent,
        },
      });

      if (updatedRows.count === 0) {
        const existing = await prisma.attendanceRecord.findUnique({ where: { id: record.id } });
        if (existing && existing.clientStatus !== "PENDING") {
          return res.json(existing);
        }
        throw new AppError(400, "Invalid or expired session");
      }

      const updated = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: record.id } });

      if (updated.sessionCompleted) {
        await syncClientSessionsCompletedFromLedger(clientId);
      }

      res.json(updated);
    }),
  );

  const trainerUpdateSchema = z.object({
    trainerStatus: z.enum(["PRESENT", "ABSENT", "RESCHEDULED"]).optional(),
    clientStatus: z.enum(["PENDING", "PRESENT", "ABSENT", "RESCHEDULED"]).optional(),
    sessionCompleted: z.boolean().optional(),
    notes: z.string().optional(),
  });

  r.patch(
    "/:id",
    requireRoles("TRAINER", "ADMIN"),
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = trainerUpdateSchema.parse(req.body);
      const record = await prisma.attendanceRecord.findUnique({ where: { id: paramId(req.params, "id") } });
      if (!record) throw new AppError(404, "Record not found");

      if (req.user!.role === "TRAINER") {
        const tid = await getTrainerProfileId(req.user!.id);
        if (record.trainerId !== tid) throw new AppError(403, "Forbidden");
      }

      const updated = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: body,
      });

      await writeAudit({
        actorId: req.user!.id,
        entity: "AttendanceRecord",
        entityId: record.id,
        action: "UPDATE",
        oldValue: record,
        newValue: updated,
      });

      await syncClientSessionsCompletedFromLedger(record.clientId);

      res.json(updated);
    }),
  );

  return r;
}
