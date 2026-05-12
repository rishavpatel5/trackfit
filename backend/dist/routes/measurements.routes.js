import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { assertClientAccessInline } from "./access.js";
import { parsePagination, sendList } from "./helpers.js";
import { writeAudit } from "../services/audit.service.js";
import { paramId } from "./params.js";
function computeBmi(weightKg, heightCm) {
    if (!weightKg || !heightCm || heightCm <= 0)
        return null;
    const m = heightCm / 100;
    const bmi = weightKg / (m * m);
    return Math.round(bmi * 10) / 10;
}
export function measurementsRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.get("/clients/:clientId", asyncHandler(async (req, res) => {
        const clientId = paramId(req.params, "clientId");
        await assertClientAccessInline(req, clientId);
        const { skip, take, page, pageSize } = parsePagination(req.query);
        const [rows, total] = await Promise.all([
            prisma.measurement.findMany({
                where: { clientId },
                skip,
                take,
                orderBy: { recordedAt: "desc" },
            }),
            prisma.measurement.count({ where: { clientId } }),
        ]);
        sendList(res, rows, total, page, pageSize);
    }));
    const upsertSchema = z.object({
        recordedAt: z.coerce.date().optional(),
        weight: z.number().optional(),
        height: z.number().optional(),
        chest: z.number().optional(),
        waist: z.number().optional(),
        hips: z.number().optional(),
        biceps: z.number().optional(),
        forearms: z.number().optional(),
        thigh: z.number().optional(),
        calves: z.number().optional(),
        bodyFat: z.number().optional(),
        bmi: z.number().optional(),
    });
    r.post("/clients/:clientId", asyncHandler(async (req, res) => {
        if (req.user.role === "CLIENT")
            throw new AppError(403, "Forbidden");
        const clientId = paramId(req.params, "clientId");
        await assertClientAccessInline(req, clientId);
        const body = upsertSchema.parse(req.body);
        const bmi = body.bmi ?? computeBmi(body.weight ?? null, body.height ?? null);
        const row = await prisma.measurement.create({
            data: {
                clientId,
                recordedAt: body.recordedAt,
                weight: body.weight,
                height: body.height,
                chest: body.chest,
                waist: body.waist,
                hips: body.hips,
                biceps: body.biceps,
                forearms: body.forearms,
                thigh: body.thigh,
                calves: body.calves,
                bodyFat: body.bodyFat,
                bmi: bmi ?? undefined,
                recordedById: req.user.id,
            },
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "Measurement",
            entityId: row.id,
            action: "CREATE",
            newValue: row,
        });
        res.status(201).json(row);
    }));
    r.delete("/:id", asyncHandler(async (req, res) => {
        if (req.user.role !== "ADMIN")
            throw new AppError(403, "Forbidden");
        const row = await prisma.measurement.findUnique({ where: { id: paramId(req.params, "id") } });
        if (!row)
            throw new AppError(404, "Not found");
        await prisma.measurement.delete({ where: { id: row.id } });
        await writeAudit({
            actorId: req.user.id,
            entity: "Measurement",
            entityId: row.id,
            action: "DELETE",
        });
        res.status(204).send();
    }));
    return r;
}
//# sourceMappingURL=measurements.routes.js.map