import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireRoles } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { generateNumericPin, hashToken } from "../lib/password.js";
import { parsePagination, sendList, getTrainerProfileId, getClientProfileId } from "./helpers.js";
import { randomUUID } from "crypto";
import { writeAudit } from "../services/audit.service.js";
import QRCode from "qrcode";
import { paramId } from "./params.js";
export function attendanceRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.get("/", asyncHandler(async (req, res) => {
        const { skip, take, page, pageSize } = parsePagination(req.query);
        const clientId = req.query.clientId ? String(req.query.clientId) : undefined;
        let where = {};
        if (req.user.role === "ADMIN") {
            if (clientId)
                where = { ...where, clientId };
        }
        else if (req.user.role === "TRAINER") {
            const tid = await getTrainerProfileId(req.user.id);
            where = { ...where, trainerId: tid, ...(clientId ? { clientId } : {}) };
        }
        else {
            const cid = await getClientProfileId(req.user.id);
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
    }));
    r.get("/analytics", asyncHandler(async (req, res) => {
        let clientScope;
        if (req.user.role === "CLIENT") {
            clientScope = await getClientProfileId(req.user.id);
        }
        else if (req.user.role === "TRAINER") {
            const tid = await getTrainerProfileId(req.user.id);
            const clients = await prisma.profileClient.findMany({
                where: { trainerId: tid },
                select: { id: true },
            });
            const ids = clients.map((c) => c.id);
            const rows = await prisma.attendanceRecord.findMany({
                where: { clientId: { in: ids } },
            });
            return aggregateAttendance(rows, res);
        }
        else if (req.query.clientId) {
            clientScope = String(req.query.clientId);
        }
        const rows = await prisma.attendanceRecord.findMany({
            where: clientScope ? { clientId: clientScope } : {},
        });
        return aggregateAttendance(rows, res);
    }));
    function aggregateAttendance(rows, res) {
        const total = rows.length;
        const completed = rows.filter((r) => r.sessionCompleted).length;
        const clientAbsent = rows.filter((r) => r.clientStatus === "ABSENT").length;
        const trainerAbsent = rows.filter((r) => r.trainerStatus === "ABSENT").length;
        const attendancePct = total === 0 ? 0 : Math.round((completed / total) * 100);
        res.json({
            totalSessions: total,
            completedSessions: completed,
            attendanceRatePercent: attendancePct,
            clientMissed: clientAbsent,
            trainerMissed: trainerAbsent,
        });
    }
    const startSchema = z.object({
        clientId: z.string().uuid(),
        trainerStatus: z.enum(["PRESENT", "ABSENT", "RESCHEDULED"]).default("PRESENT"),
        notes: z.string().optional(),
    });
    r.post("/sessions/start", requireRoles("TRAINER"), asyncHandler(async (req, res) => {
        const body = startSchema.parse(req.body);
        const trainerId = await getTrainerProfileId(req.user.id);
        const client = await prisma.profileClient.findFirst({
            where: { id: body.clientId, trainerId },
        });
        if (!client)
            throw new AppError(403, "Client not assigned to you");
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
            actorId: req.user.id,
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
    }));
    const verifyPinSchema = z.object({
        pin: z.string().length(6),
    });
    r.post("/sessions/verify-pin", requireRoles("CLIENT"), asyncHandler(async (req, res) => {
        const body = verifyPinSchema.parse(req.body);
        const clientId = await getClientProfileId(req.user.id);
        const pinHash = hashToken(body.pin);
        const record = await prisma.attendanceRecord.findFirst({
            where: {
                clientId,
                expiresAt: { gt: new Date() },
                clientStatus: "PENDING",
            },
            orderBy: { startedAt: "desc" },
        });
        if (!record || record.pinHash !== pinHash) {
            throw new AppError(400, "Invalid or expired PIN");
        }
        const updated = await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                clientStatus: "PRESENT",
                clientVerifiedAt: new Date(),
                sessionCompleted: record.trainerStatus === "PRESENT",
            },
        });
        if (updated.sessionCompleted) {
            await prisma.profileClient.update({
                where: { id: clientId },
                data: { sessionsCompleted: { increment: 1 } },
            });
        }
        await writeAudit({
            actorId: req.user.id,
            entity: "AttendanceRecord",
            entityId: record.id,
            action: "CLIENT_VERIFY_PIN",
        });
        res.json(updated);
    }));
    const verifyTokenSchema = z.object({
        token: z.string().uuid(),
    });
    r.post("/sessions/verify-token", asyncHandler(async (req, res) => {
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
        if (!record)
            throw new AppError(400, "Invalid or expired session");
        const updated = await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                clientStatus: "PRESENT",
                clientVerifiedAt: new Date(),
                sessionCompleted: record.trainerStatus === "PRESENT",
            },
        });
        if (updated.sessionCompleted) {
            await prisma.profileClient.update({
                where: { id: clientId },
                data: { sessionsCompleted: { increment: 1 } },
            });
        }
        res.json(updated);
    }));
    const trainerUpdateSchema = z.object({
        trainerStatus: z.enum(["PRESENT", "ABSENT", "RESCHEDULED"]).optional(),
        clientStatus: z.enum(["PENDING", "PRESENT", "ABSENT", "RESCHEDULED"]).optional(),
        sessionCompleted: z.boolean().optional(),
        notes: z.string().optional(),
    });
    r.patch("/:id", requireRoles("TRAINER", "ADMIN"), asyncHandler(async (req, res) => {
        const body = trainerUpdateSchema.parse(req.body);
        const record = await prisma.attendanceRecord.findUnique({ where: { id: paramId(req.params, "id") } });
        if (!record)
            throw new AppError(404, "Record not found");
        if (req.user.role === "TRAINER") {
            const tid = await getTrainerProfileId(req.user.id);
            if (record.trainerId !== tid)
                throw new AppError(403, "Forbidden");
        }
        const updated = await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: body,
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "AttendanceRecord",
            entityId: record.id,
            action: "UPDATE",
            oldValue: record,
            newValue: updated,
        });
        res.json(updated);
    }));
    return r;
}
//# sourceMappingURL=attendance.routes.js.map