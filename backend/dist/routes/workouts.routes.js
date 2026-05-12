import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { assertClientAccessInline } from "./access.js";
import { writeAudit } from "../services/audit.service.js";
import { notifyUser } from "../services/notification.service.js";
import { paramId } from "./params.js";
export function workoutsRouter(_env) {
    const r = Router();
    r.use(authMiddleware(_env));
    r.get("/clients/:clientId/weeks", asyncHandler(async (req, res) => {
        await assertClientAccessInline(req, paramId(req.params, "clientId"));
        const weeks = await prisma.workoutWeek.findMany({
            where: { clientId: paramId(req.params, "clientId") },
            orderBy: { weekNumber: "asc" },
            include: {
                days: {
                    orderBy: { sortOrder: "asc" },
                    include: { exercises: { orderBy: { sortOrder: "asc" } } },
                },
            },
        });
        res.json(weeks);
    }));
    const createWeekSchema = z.object({
        weekNumber: z.number().int().positive(),
        days: z
            .array(z.object({
            label: z.string(),
            sortOrder: z.number().int().optional(),
            exercises: z.array(z.object({
                name: z.string(),
                sets: z.number().int().optional(),
                reps: z.string().optional(),
                weight: z.string().optional(),
                restSec: z.number().int().optional(),
                tempo: z.string().optional(),
                notes: z.string().optional(),
                sortOrder: z.number().int().optional(),
            })),
        }))
            .optional(),
    });
    r.post("/clients/:clientId/weeks", asyncHandler(async (req, res) => {
        if (req.user.role === "CLIENT")
            throw new AppError(403, "Forbidden");
        await assertClientAccessInline(req, paramId(req.params, "clientId"));
        const body = createWeekSchema.parse(req.body);
        const exists = await prisma.workoutWeek.findUnique({
            where: {
                clientId_weekNumber: { clientId: paramId(req.params, "clientId"), weekNumber: body.weekNumber },
            },
        });
        if (exists)
            throw new AppError(409, "Week already exists");
        const week = await prisma.workoutWeek.create({
            data: {
                clientId: paramId(req.params, "clientId"),
                weekNumber: body.weekNumber,
                createdById: req.user.id,
                updatedById: req.user.id,
                days: body.days?.length
                    ? {
                        create: body.days.map((d, idx) => ({
                            label: d.label,
                            sortOrder: d.sortOrder ?? idx,
                            exercises: {
                                create: (d.exercises ?? []).map((e, i) => ({
                                    name: e.name,
                                    sets: e.sets,
                                    reps: e.reps,
                                    weight: e.weight,
                                    restSec: e.restSec,
                                    tempo: e.tempo,
                                    notes: e.notes,
                                    sortOrder: e.sortOrder ?? i,
                                })),
                            },
                        })),
                    }
                    : undefined,
            },
            include: {
                days: { include: { exercises: true } },
            },
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "WorkoutWeek",
            entityId: week.id,
            action: "CREATE",
            newValue: week,
        });
        const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "clientId") } });
        if (client) {
            await notifyUser({
                userId: client.userId,
                type: "WORKOUT_UPDATED",
                title: "Workout plan updated",
                body: `Week ${week.weekNumber} was added by your trainer.`,
            });
        }
        res.status(201).json(week);
    }));
    const patchWeekSchema = z.object({
        days: z.array(z.object({
            id: z.string().uuid().optional(),
            label: z.string(),
            sortOrder: z.number().int(),
            exercises: z.array(z.object({
                id: z.string().uuid().optional(),
                name: z.string(),
                sets: z.number().int().optional(),
                reps: z.string().optional(),
                weight: z.string().optional(),
                restSec: z.number().int().optional(),
                tempo: z.string().optional(),
                notes: z.string().optional(),
                sortOrder: z.number().int(),
            })),
        })),
    });
    r.patch("/weeks/:weekId", asyncHandler(async (req, res) => {
        if (req.user.role === "CLIENT")
            throw new AppError(403, "Forbidden");
        const body = patchWeekSchema.parse(req.body);
        const week = await prisma.workoutWeek.findUnique({
            where: { id: paramId(req.params, "weekId") },
        });
        if (!week)
            throw new AppError(404, "Week not found");
        await assertClientAccessInline(req, week.clientId);
        const updated = await prisma.$transaction(async (tx) => {
            await tx.workoutDay.deleteMany({ where: { weekId: week.id } });
            await tx.workoutDay.createMany({
                data: body.days.map((d) => ({
                    weekId: week.id,
                    label: d.label,
                    sortOrder: d.sortOrder,
                })),
            });
            const days = await tx.workoutDay.findMany({
                where: { weekId: week.id },
                orderBy: { sortOrder: "asc" },
            });
            for (let i = 0; i < body.days.length; i++) {
                const dayRow = days[i];
                const incoming = body.days[i];
                await tx.exerciseRow.createMany({
                    data: incoming.exercises.map((e) => ({
                        dayId: dayRow.id,
                        name: e.name,
                        sets: e.sets,
                        reps: e.reps,
                        weight: e.weight,
                        restSec: e.restSec,
                        tempo: e.tempo,
                        notes: e.notes,
                        sortOrder: e.sortOrder,
                    })),
                });
            }
            return tx.workoutWeek.update({
                where: { id: week.id },
                data: { updatedById: req.user.id },
                include: {
                    days: { orderBy: { sortOrder: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" } } } },
                },
            });
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "WorkoutWeek",
            entityId: week.id,
            action: "UPDATE_FULL",
            oldValue: week,
            newValue: updated,
        });
        const client = await prisma.profileClient.findUnique({ where: { id: week.clientId } });
        if (client) {
            await notifyUser({
                userId: client.userId,
                type: "WORKOUT_UPDATED",
                title: "Workout plan updated",
                body: `Week ${updated.weekNumber} was revised.`,
            });
        }
        res.json(updated);
    }));
    r.delete("/weeks/:weekId", asyncHandler(async (req, res) => {
        if (req.user.role !== "ADMIN") {
            throw new AppError(403, "Only administrators can delete workout weeks");
        }
        const week = await prisma.workoutWeek.findUnique({ where: { id: paramId(req.params, "weekId") } });
        if (!week)
            throw new AppError(404, "Week not found");
        await prisma.workoutWeek.delete({ where: { id: week.id } });
        await writeAudit({
            actorId: req.user.id,
            entity: "WorkoutWeek",
            entityId: week.id,
            action: "DELETE",
        });
        res.status(204).send();
    }));
    return r;
}
//# sourceMappingURL=workouts.routes.js.map