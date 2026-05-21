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
import { endOfGymSessionDay, formatGymDateLabel, gymSessionDate } from "../lib/gym-time.js";
import { closePastDaySessions, computeSessionFlags, syncSessionsCompleted, } from "../services/attendance-session.service.js";
import QRCode from "qrcode";
import { paramId } from "./params.js";
async function completeClientVerification(recordId, clientId) {
    return prisma.$transaction(async (tx) => {
        const record = await tx.attendanceRecord.findFirst({
            where: {
                id: recordId,
                clientId,
                sessionDate: gymSessionDate(),
            },
        });
        if (!record)
            throw new AppError(400, "Invalid or expired session for today");
        if (record.clientStatus !== "PENDING") {
            return record;
        }
        if (record.trainerStatus !== "PRESENT") {
            throw new AppError(400, "Trainer marked absent — this session does not require client verification");
        }
        const flags = computeSessionFlags(record.trainerStatus, "PRESENT");
        const updated = await tx.attendanceRecord.update({
            where: { id: recordId },
            data: {
                clientStatus: "PRESENT",
                clientVerifiedAt: new Date(),
                ...flags,
            },
        });
        if (updated.sessionCharged) {
            await syncSessionsCompleted(clientId, tx);
        }
        return updated;
    });
}
async function markClientAbsent(recordId, trainerId) {
    const record = await prisma.attendanceRecord.findUnique({ where: { id: recordId } });
    if (!record || record.trainerId !== trainerId)
        throw new AppError(404, "Record not found");
    if (record.trainerStatus !== "PRESENT") {
        throw new AppError(400, "Cannot mark client absent when trainer was absent for this day");
    }
    const flags = computeSessionFlags(record.trainerStatus, "ABSENT");
    const updated = await prisma.attendanceRecord.update({
        where: { id: recordId },
        data: {
            clientStatus: "ABSENT",
            ...flags,
        },
    });
    await syncSessionsCompleted(record.clientId);
    return updated;
}
export function attendanceRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.use(asyncHandler(async (_req, _res, next) => {
        await closePastDaySessions();
        next();
    }));
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
        const charged = rows.filter((r) => r.sessionCharged).length;
        const clientAbsent = rows.filter((r) => r.clientStatus === "ABSENT").length;
        const trainerAbsent = rows.filter((r) => r.trainerStatus === "ABSENT").length;
        const attendancePct = total === 0 ? 0 : Math.round((completed / total) * 100);
        res.json({
            totalSessions: total,
            completedSessions: completed,
            chargedSessions: charged,
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
        await closePastDaySessions();
        const sessionDate = gymSessionDate();
        const dayLabel = formatGymDateLabel();
        const existing = await prisma.attendanceRecord.findUnique({
            where: { clientId_sessionDate: { clientId: client.id, sessionDate } },
        });
        const trainerHeldSession = body.trainerStatus === "PRESENT";
        if (existing && existing.clientStatus !== "PENDING") {
            throw new AppError(409, `This client already has attendance logged for ${dayLabel} (${existing.clientStatus}). A new session starts on the next calendar day.`);
        }
        if (existing && existing.clientStatus === "PENDING" && trainerHeldSession) {
            const pin = generateNumericPin(6);
            const pinHash = hashToken(pin);
            const verifyToken = randomUUID();
            const expiresAt = endOfGymSessionDay();
            const record = await prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: {
                    pinHash,
                    verifyToken,
                    expiresAt,
                    trainerStatus: body.trainerStatus,
                    trainerCheckedAt: new Date(),
                    notes: body.notes ?? existing.notes,
                },
            });
            const verifyUrl = `${env.FRONTEND_URL}/client/verify-attendance`;
            const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });
            return res.status(200).json({
                attendanceId: record.id,
                pin,
                verifyToken,
                verifyUrl,
                qrDataUrl,
                expiresAt,
                sessionDate: sessionDate.toISOString(),
                refreshed: true,
                message: "New PIN issued for today's calendar day.",
            });
        }
        if (existing) {
            throw new AppError(409, `Attendance for ${dayLabel} is already on file.`);
        }
        if (!trainerHeldSession) {
            const flags = computeSessionFlags(body.trainerStatus, "ABSENT");
            const record = await prisma.attendanceRecord.create({
                data: {
                    clientId: client.id,
                    trainerId,
                    sessionDate,
                    pinHash: hashToken(randomUUID()),
                    verifyToken: randomUUID(),
                    expiresAt: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000),
                    trainerStatus: body.trainerStatus,
                    trainerCheckedAt: new Date(),
                    clientStatus: "ABSENT",
                    notes: body.notes,
                    ...flags,
                },
            });
            await writeAudit({
                actorId: req.user.id,
                entity: "AttendanceRecord",
                entityId: record.id,
                action: "TRAINER_ABSENT_DAY",
                newValue: { clientId: client.id, sessionDate, trainerStatus: body.trainerStatus },
            });
            return res.status(201).json({
                attendanceId: record.id,
                trainerAbsent: true,
                sessionCharged: false,
                message: "Trainer absent — client package will not be charged for this day.",
            });
        }
        const pin = generateNumericPin(6);
        const pinHash = hashToken(pin);
        const verifyToken = randomUUID();
        const expiresAt = endOfGymSessionDay();
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
                ...computeSessionFlags(body.trainerStatus, "PENDING"),
            },
        });
        const verifyUrl = `${env.FRONTEND_URL}/client/verify-attendance`;
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
            sessionDate: sessionDate.toISOString(),
        });
    }));
    const verifyPinSchema = z.object({
        pin: z.string().length(6),
    });
    r.post("/sessions/verify-pin", requireRoles("CLIENT"), asyncHandler(async (req, res) => {
        const body = verifyPinSchema.parse(req.body);
        const clientId = await getClientProfileId(req.user.id);
        const pinHash = hashToken(body.pin);
        await closePastDaySessions();
        const sessionDate = gymSessionDate();
        const record = await prisma.attendanceRecord.findFirst({
            where: {
                clientId,
                sessionDate,
                clientStatus: "PENDING",
                trainerStatus: "PRESENT",
                pinHash,
            },
            orderBy: { startedAt: "desc" },
        });
        if (!record) {
            throw new AppError(400, "Invalid PIN, or today's session is already finalized");
        }
        const updated = await completeClientVerification(record.id, clientId);
        await writeAudit({
            actorId: req.user.id,
            entity: "AttendanceRecord",
            entityId: record.id,
            action: "CLIENT_VERIFY_PIN",
        });
        res.json(updated);
    }));
    r.post("/sessions/:id/mark-client-absent", requireRoles("TRAINER"), asyncHandler(async (req, res) => {
        const trainerId = await getTrainerProfileId(req.user.id);
        const updated = await markClientAbsent(paramId(req.params, "id"), trainerId);
        await writeAudit({
            actorId: req.user.id,
            entity: "AttendanceRecord",
            entityId: updated.id,
            action: "MARK_CLIENT_ABSENT",
        });
        res.json(updated);
    }));
    const trainerUpdateSchema = z.object({
        trainerStatus: z.enum(["PRESENT", "ABSENT", "RESCHEDULED"]).optional(),
        clientStatus: z.enum(["PENDING", "PRESENT", "ABSENT", "RESCHEDULED"]).optional(),
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
        const nextTrainer = body.trainerStatus ?? record.trainerStatus;
        const nextClient = body.clientStatus ?? record.clientStatus;
        const flags = computeSessionFlags(nextTrainer, nextClient);
        const updated = await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                trainerStatus: body.trainerStatus,
                clientStatus: body.clientStatus,
                notes: body.notes,
                ...flags,
            },
        });
        await syncSessionsCompleted(record.clientId);
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