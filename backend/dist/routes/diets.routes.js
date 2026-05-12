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
function dayMacros(meals) {
    return meals.reduce((acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
export function dietsRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.get("/clients/:clientId/weeks", asyncHandler(async (req, res) => {
        await assertClientAccessInline(req, paramId(req.params, "clientId"));
        const weeks = await prisma.dietWeek.findMany({
            where: { clientId: paramId(req.params, "clientId") },
            orderBy: { weekNumber: "asc" },
            include: {
                days: {
                    orderBy: { sortOrder: "asc" },
                    include: { meals: { orderBy: { sortOrder: "asc" } } },
                },
            },
        });
        const enriched = weeks.map((w) => ({
            ...w,
            days: w.days.map((d) => ({
                ...d,
                macros: dayMacros(d.meals),
            })),
        }));
        res.json(enriched);
    }));
    const createWeekSchema = z.object({
        weekNumber: z.number().int().positive(),
        days: z
            .array(z.object({
            label: z.string(),
            sortOrder: z.number().int().optional(),
            meals: z.array(z.object({
                slotLabel: z.string().optional(),
                foodName: z.string(),
                quantity: z.string().optional(),
                calories: z.number().nonnegative(),
                protein: z.number().nonnegative(),
                carbs: z.number().nonnegative(),
                fat: z.number().nonnegative(),
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
        const exists = await prisma.dietWeek.findUnique({
            where: {
                clientId_weekNumber: { clientId: paramId(req.params, "clientId"), weekNumber: body.weekNumber },
            },
        });
        if (exists)
            throw new AppError(409, "Week already exists");
        const week = await prisma.dietWeek.create({
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
                            meals: {
                                create: (d.meals ?? []).map((m, i) => ({
                                    slotLabel: m.slotLabel ?? `Meal ${i + 1}`,
                                    foodName: m.foodName,
                                    quantity: m.quantity,
                                    calories: m.calories,
                                    protein: m.protein,
                                    carbs: m.carbs,
                                    fat: m.fat,
                                    sortOrder: m.sortOrder ?? i,
                                })),
                            },
                        })),
                    }
                    : undefined,
            },
            include: {
                days: { include: { meals: true } },
            },
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "DietWeek",
            entityId: week.id,
            action: "CREATE",
            newValue: week,
        });
        const client = await prisma.profileClient.findUnique({ where: { id: paramId(req.params, "clientId") } });
        if (client) {
            await notifyUser({
                userId: client.userId,
                type: "DIET_UPDATED",
                title: "Diet plan updated",
                body: `Week ${week.weekNumber} nutrition targets were published.`,
            });
        }
        res.status(201).json(week);
    }));
    const patchWeekSchema = z.object({
        days: z.array(z.object({
            label: z.string(),
            sortOrder: z.number().int(),
            meals: z.array(z.object({
                slotLabel: z.string().optional(),
                foodName: z.string(),
                quantity: z.string().optional(),
                calories: z.number().nonnegative(),
                protein: z.number().nonnegative(),
                carbs: z.number().nonnegative(),
                fat: z.number().nonnegative(),
                sortOrder: z.number().int(),
            })),
        })),
    });
    r.patch("/weeks/:weekId", asyncHandler(async (req, res) => {
        if (req.user.role === "CLIENT")
            throw new AppError(403, "Forbidden");
        const body = patchWeekSchema.parse(req.body);
        const week = await prisma.dietWeek.findUnique({ where: { id: paramId(req.params, "weekId") } });
        if (!week)
            throw new AppError(404, "Week not found");
        await assertClientAccessInline(req, week.clientId);
        const updated = await prisma.$transaction(async (tx) => {
            await tx.dietDay.deleteMany({ where: { weekId: week.id } });
            await tx.dietDay.createMany({
                data: body.days.map((d) => ({
                    weekId: week.id,
                    label: d.label,
                    sortOrder: d.sortOrder,
                })),
            });
            const days = await tx.dietDay.findMany({
                where: { weekId: week.id },
                orderBy: { sortOrder: "asc" },
            });
            for (let i = 0; i < body.days.length; i++) {
                const dayRow = days[i];
                const incoming = body.days[i];
                await tx.mealRow.createMany({
                    data: incoming.meals.map((m) => ({
                        dayId: dayRow.id,
                        slotLabel: m.slotLabel ?? "Meal",
                        foodName: m.foodName,
                        quantity: m.quantity,
                        calories: m.calories,
                        protein: m.protein,
                        carbs: m.carbs,
                        fat: m.fat,
                        sortOrder: m.sortOrder,
                    })),
                });
            }
            return tx.dietWeek.update({
                where: { id: week.id },
                data: { updatedById: req.user.id },
                include: {
                    days: { orderBy: { sortOrder: "asc" }, include: { meals: { orderBy: { sortOrder: "asc" } } } },
                },
            });
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "DietWeek",
            entityId: week.id,
            action: "UPDATE_FULL",
            oldValue: week,
            newValue: updated,
        });
        const client = await prisma.profileClient.findUnique({ where: { id: week.clientId } });
        if (client) {
            await notifyUser({
                userId: client.userId,
                type: "DIET_UPDATED",
                title: "Diet plan updated",
                body: `Week ${updated.weekNumber} meals were revised.`,
            });
        }
        res.json(updated);
    }));
    r.delete("/weeks/:weekId", asyncHandler(async (req, res) => {
        if (req.user.role !== "ADMIN") {
            throw new AppError(403, "Only administrators can delete diet weeks");
        }
        const week = await prisma.dietWeek.findUnique({ where: { id: paramId(req.params, "weekId") } });
        if (!week)
            throw new AppError(404, "Week not found");
        await prisma.dietWeek.delete({ where: { id: week.id } });
        await writeAudit({
            actorId: req.user.id,
            entity: "DietWeek",
            entityId: week.id,
            action: "DELETE",
        });
        res.status(204).send();
    }));
    return r;
}
//# sourceMappingURL=diets.routes.js.map