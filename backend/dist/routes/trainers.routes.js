import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { authMiddleware, requireRoles } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { parsePagination, sendList } from "./helpers.js";
import { writeAudit } from "../services/audit.service.js";
import { paramId } from "./params.js";
export function trainersRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.use(requireRoles("ADMIN"));
    const createSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        bio: z.string().optional(),
        specialization: z.string().optional(),
    });
    r.get("/", asyncHandler(async (req, res) => {
        const { skip, take, page, pageSize } = parsePagination(req.query);
        const search = String(req.query.search ?? "").trim();
        const where = search
            ? {
                user: {
                    OR: [
                        { email: { contains: search, mode: "insensitive" } },
                        { firstName: { contains: search, mode: "insensitive" } },
                        { lastName: { contains: search, mode: "insensitive" } },
                    ],
                },
            }
            : {};
        const [rows, total] = await Promise.all([
            prisma.profileTrainer.findMany({
                where,
                skip,
                take,
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, active: true } },
                    _count: { select: { clients: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.profileTrainer.count({ where }),
        ]);
        sendList(res, rows, total, page, pageSize);
    }));
    r.post("/", asyncHandler(async (req, res) => {
        const body = createSchema.parse(req.body);
        const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
        if (exists)
            throw new AppError(409, "Email already registered");
        const passwordHash = await hashPassword(body.password, env.BCRYPT_ROUNDS);
        const trainer = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: body.email.toLowerCase(),
                    passwordHash,
                    role: "TRAINER",
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone,
                },
            });
            return tx.profileTrainer.create({
                data: {
                    userId: user.id,
                    bio: body.bio,
                    specialization: body.specialization,
                },
                include: { user: true },
            });
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "Trainer",
            entityId: trainer.id,
            action: "CREATE",
            newValue: trainer,
        });
        res.status(201).json(trainer);
    }));
    const updateSchema = createSchema.partial().extend({
        password: z.string().min(8).optional(),
        active: z.boolean().optional(),
    });
    r.patch("/:id", asyncHandler(async (req, res) => {
        const id = paramId(req.params, "id");
        const body = updateSchema.parse(req.body);
        const trainer = await prisma.profileTrainer.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!trainer)
            throw new AppError(404, "Trainer not found");
        const oldSnap = { ...trainer, user: trainer.user };
        const passwordHash = body.password !== undefined ? await hashPassword(body.password, env.BCRYPT_ROUNDS) : undefined;
        const updated = await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: trainer.userId },
                data: {
                    firstName: body.firstName ?? undefined,
                    lastName: body.lastName ?? undefined,
                    phone: body.phone ?? undefined,
                    active: body.active ?? undefined,
                    ...(passwordHash ? { passwordHash } : {}),
                    ...(body.email ? { email: body.email.toLowerCase() } : {}),
                },
            });
            return tx.profileTrainer.update({
                where: { id },
                data: {
                    bio: body.bio ?? undefined,
                    specialization: body.specialization ?? undefined,
                },
                include: { user: true },
            });
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "Trainer",
            entityId: id,
            action: "UPDATE",
            oldValue: oldSnap,
            newValue: updated,
        });
        res.json(updated);
    }));
    r.post("/:id/reset-password", asyncHandler(async (req, res) => {
        const schema = z.object({ password: z.string().min(8) });
        const { password } = schema.parse(req.body);
        const trainer = await prisma.profileTrainer.findUnique({ where: { id: paramId(req.params, "id") } });
        if (!trainer)
            throw new AppError(404, "Trainer not found");
        const passwordHash = await hashPassword(password, env.BCRYPT_ROUNDS);
        await prisma.user.update({ where: { id: trainer.userId }, data: { passwordHash } });
        await writeAudit({
            actorId: req.user.id,
            entity: "Trainer",
            entityId: trainer.id,
            action: "RESET_PASSWORD",
        });
        res.json({ message: "Password reset" });
    }));
    r.delete("/:id", asyncHandler(async (req, res) => {
        const trainer = await prisma.profileTrainer.findUnique({
            where: { id: paramId(req.params, "id") },
            include: { _count: { select: { clients: true } } },
        });
        if (!trainer)
            throw new AppError(404, "Trainer not found");
        if (trainer._count.clients > 0) {
            throw new AppError(400, "Reassign or remove clients before deleting trainer");
        }
        await prisma.$transaction([
            prisma.profileTrainer.delete({ where: { id: trainer.id } }),
            prisma.user.delete({ where: { id: trainer.userId } }),
        ]);
        await writeAudit({
            actorId: req.user.id,
            entity: "Trainer",
            entityId: trainer.id,
            action: "DELETE",
        });
        res.status(204).send();
    }));
    return r;
}
//# sourceMappingURL=trainers.routes.js.map