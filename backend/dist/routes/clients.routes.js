import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { authMiddleware, requireRoles } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { getTrainerProfileId, parsePagination, sendList, } from "./helpers.js";
import { writeAudit } from "../services/audit.service.js";
import { paramId } from "./params.js";
import { notifyUser } from "../services/notification.service.js";
import { syncClientSessionsCompletedFromLedger } from "../services/attendance-sync.service.js";
async function assertClientAccess(req, clientId) {
    const role = req.user.role;
    if (role === "ADMIN")
        return;
    if (role === "CLIENT") {
        const mine = await prisma.profileClient.findFirst({ where: { id: clientId, userId: req.user.id } });
        if (!mine)
            throw new AppError(403, "Forbidden");
        return;
    }
    if (role === "TRAINER") {
        const tid = await getTrainerProfileId(req.user.id);
        const c = await prisma.profileClient.findFirst({ where: { id: clientId, trainerId: tid } });
        if (!c)
            throw new AppError(403, "Forbidden");
    }
}
export function clientsRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.get("/", asyncHandler(async (req, res) => {
        const { skip, take, page, pageSize } = parsePagination(req.query);
        const search = String(req.query.search ?? "").trim();
        let where = {};
        if (req.user.role === "TRAINER") {
            const tid = await getTrainerProfileId(req.user.id);
            where = { ...where, trainerId: tid };
        }
        else if (req.user.role !== "ADMIN") {
            throw new AppError(403, "Forbidden");
        }
        if (search) {
            where = {
                ...where,
                user: {
                    OR: [
                        { email: { contains: search, mode: "insensitive" } },
                        { firstName: { contains: search, mode: "insensitive" } },
                        { lastName: { contains: search, mode: "insensitive" } },
                    ],
                },
            };
        }
        const [rows, total] = await Promise.all([
            prisma.profileClient.findMany({
                where,
                skip,
                take,
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, active: true } },
                    trainer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.profileClient.count({ where }),
        ]);
        sendList(res, rows, total, page, pageSize);
    }));
    const adminOnly = requireRoles("ADMIN");
    const createSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        trainerId: z.string().uuid(),
        age: z.number().int().optional(),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        goal: z.string().optional(),
        medicalNotes: z.string().optional(),
        membershipStart: z.coerce.date().optional(),
        membershipEnd: z.coerce.date().optional(),
        totalSessions: z.number().int().nonnegative().optional(),
        sessionsCompleted: z.number().int().nonnegative().optional(),
    });
    r.post("/", adminOnly, asyncHandler(async (req, res) => {
        const body = createSchema.parse(req.body);
        const trainer = await prisma.profileTrainer.findUnique({ where: { id: body.trainerId } });
        if (!trainer)
            throw new AppError(404, "Trainer not found");
        const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
        if (exists)
            throw new AppError(409, "Email already registered");
        const passwordHash = await hashPassword(body.password, env.BCRYPT_ROUNDS);
        const client = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: body.email.toLowerCase(),
                    passwordHash,
                    role: "CLIENT",
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone,
                },
            });
            return tx.profileClient.create({
                data: {
                    userId: user.id,
                    trainerId: body.trainerId,
                    age: body.age,
                    gender: body.gender,
                    emergencyContact: body.emergencyContact,
                    emergencyPhone: body.emergencyPhone,
                    goal: body.goal,
                    medicalNotes: body.medicalNotes,
                    membershipStart: body.membershipStart,
                    membershipEnd: body.membershipEnd,
                    totalSessions: body.totalSessions ?? 0,
                    sessionsCompleted: body.sessionsCompleted ?? 0,
                },
                include: { user: true, trainer: { include: { user: true } } },
            });
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "Client",
            entityId: client.id,
            action: "CREATE",
            newValue: client,
        });
        await notifyUser({
            userId: client.userId,
            type: "WORKOUT_UPDATED",
            title: "Welcome aboard",
            body: "Your trainer has added you to the transformation platform.",
        });
        res.status(201).json(client);
    }));
    r.get("/:id", asyncHandler(async (req, res) => {
        const cid = paramId(req.params, "id");
        await assertClientAccess(req, cid);
        const client = await prisma.profileClient.findUnique({
            where: { id: cid },
            include: {
                user: true,
                trainer: { include: { user: true } },
            },
        });
        if (!client)
            throw new AppError(404, "Client not found");
        await syncClientSessionsCompletedFromLedger(cid);
        const synced = await prisma.profileClient.findUniqueOrThrow({
            where: { id: cid },
            include: {
                user: true,
                trainer: { include: { user: true } },
            },
        });
        res.json(synced);
    }));
    const updateSchema = z.object({
        trainerId: z.string().uuid().optional(),
        age: z.number().int().optional(),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        goal: z.string().optional(),
        medicalNotes: z.string().optional(),
        membershipStart: z.coerce.date().optional(),
        membershipEnd: z.coerce.date().optional(),
        totalSessions: z.number().int().nonnegative().optional(),
        sessionsCompleted: z.number().int().nonnegative().optional(),
        active: z.boolean().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
    });
    r.patch("/:id", adminOnly, asyncHandler(async (req, res) => {
        const body = updateSchema.parse(req.body);
        const clientId = paramId(req.params, "id");
        const client = await prisma.profileClient.findUnique({
            where: { id: clientId },
            include: { user: true },
        });
        if (!client)
            throw new AppError(404, "Client not found");
        const oldSnap = structuredClone(client);
        const updated = await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: client.userId },
                data: {
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone,
                    email: body.email?.toLowerCase(),
                    active: body.active,
                },
            });
            return tx.profileClient.update({
                where: { id: client.id },
                data: {
                    trainerId: body.trainerId,
                    age: body.age,
                    gender: body.gender,
                    emergencyContact: body.emergencyContact,
                    emergencyPhone: body.emergencyPhone,
                    goal: body.goal,
                    medicalNotes: body.medicalNotes,
                    membershipStart: body.membershipStart,
                    membershipEnd: body.membershipEnd,
                    totalSessions: body.totalSessions,
                    sessionsCompleted: body.sessionsCompleted,
                },
                include: { user: true, trainer: { include: { user: true } } },
            });
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "Client",
            entityId: clientId,
            action: "UPDATE",
            oldValue: oldSnap,
            newValue: updated,
        });
        if (body.trainerId && body.trainerId !== client.trainerId) {
            await notifyUser({
                userId: updated.userId,
                type: "WORKOUT_UPDATED",
                title: "Trainer updated",
                body: "You were assigned to a new trainer.",
            });
        }
        res.json(updated);
    }));
    r.post("/:id/extend-membership", adminOnly, asyncHandler(async (req, res) => {
        const schema = z.object({
            days: z.number().int().positive(),
            addSessions: z.number().int().nonnegative().optional(),
        });
        const body = schema.parse(req.body);
        const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "id") } });
        if (!client)
            throw new AppError(404, "Client not found");
        const base = client.membershipEnd && client.membershipEnd > new Date() ? client.membershipEnd : new Date();
        const end = new Date(base);
        end.setDate(end.getDate() + body.days);
        const updated = await prisma.profileClient.update({
            where: { id: client.id },
            data: {
                membershipEnd: end,
                totalSessions: body.addSessions ? client.totalSessions + body.addSessions : undefined,
            },
            include: { user: true },
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "Client",
            entityId: client.id,
            action: "EXTEND_MEMBERSHIP",
            oldValue: client,
            newValue: updated,
        });
        await notifyUser({
            userId: client.userId,
            type: "MEMBERSHIP_EXPIRING",
            title: "Membership extended",
            body: `Your membership end date is now ${end.toISOString().slice(0, 10)}.`,
        });
        res.json(updated);
    }));
    r.post("/:id/reset-password", adminOnly, asyncHandler(async (req, res) => {
        const schema = z.object({ password: z.string().min(8) });
        const { password } = schema.parse(req.body);
        const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "id") } });
        if (!client)
            throw new AppError(404, "Client not found");
        const passwordHash = await hashPassword(password, env.BCRYPT_ROUNDS);
        await prisma.user.update({ where: { id: client.userId }, data: { passwordHash } });
        await writeAudit({
            actorId: req.user.id,
            entity: "Client",
            entityId: client.id,
            action: "RESET_PASSWORD",
        });
        res.json({ message: "Password reset" });
    }));
    r.delete("/:id", adminOnly, asyncHandler(async (req, res) => {
        const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "id") } });
        if (!client)
            throw new AppError(404, "Client not found");
        await prisma.$transaction([
            prisma.profileClient.delete({ where: { id: client.id } }),
            prisma.user.delete({ where: { id: client.userId } }),
        ]);
        await writeAudit({
            actorId: req.user.id,
            entity: "Client",
            entityId: client.id,
            action: "DELETE",
        });
        res.status(204).send();
    }));
    return r;
}
//# sourceMappingURL=clients.routes.js.map