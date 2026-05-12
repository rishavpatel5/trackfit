import { Router } from "express";
import { z } from "zod";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { assertClientAccessInline } from "./access.js";
import { parsePagination, sendList } from "./helpers.js";
import { writeAudit } from "../services/audit.service.js";
import { paramId } from "./params.js";

export function progressRouter(env: Env) {
  const r = Router();
  r.use(authMiddleware(env));

  r.get(
    "/clients/:clientId/entries",
    asyncHandler(async (req: AuthedRequest, res) => {
      await assertClientAccessInline(req, paramId(req.params, "clientId"));
      const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
      const [rows, total] = await Promise.all([
        prisma.progressEntry.findMany({
          where: { clientId: paramId(req.params, "clientId") },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.progressEntry.count({ where: { clientId: paramId(req.params, "clientId") } }),
      ]);
      sendList(res, rows, total, page, pageSize);
    }),
  );

  const entrySchema = z.object({
    weekNumber: z.number().int().optional(),
    weekStartDate: z.coerce.date().optional(),
    trainerComments: z.string().optional(),
    recovery: z.string().optional(),
    energyLevel: z.string().optional(),
    performanceNotes: z.string().optional(),
    strengthNotes: z.string().optional(),
  });

  r.post(
    "/clients/:clientId/entries",
    asyncHandler(async (req: AuthedRequest, res) => {
      if (req.user!.role === "CLIENT") throw new AppError(403, "Forbidden");
      await assertClientAccessInline(req, paramId(req.params, "clientId"));
      const body = entrySchema.parse(req.body);
      const row = await prisma.progressEntry.create({
        data: {
          clientId: paramId(req.params, "clientId"),
          ...body,
          createdById: req.user!.id,
        },
      });
      await writeAudit({
        actorId: req.user!.id,
        entity: "ProgressEntry",
        entityId: row.id,
        action: "CREATE",
        newValue: row,
      });
      res.status(201).json(row);
    }),
  );

  r.patch(
    "/entries/:id",
    asyncHandler(async (req: AuthedRequest, res) => {
      if (req.user!.role === "CLIENT") throw new AppError(403, "Forbidden");
      const body = entrySchema.partial().parse(req.body);
      const existing = await prisma.progressEntry.findUnique({ where: { id: paramId(req.params, "id") } });
      if (!existing) throw new AppError(404, "Not found");
      await assertClientAccessInline(req, existing.clientId);
      const updated = await prisma.progressEntry.update({
        where: { id: existing.id },
        data: body,
      });
      await writeAudit({
        actorId: req.user!.id,
        entity: "ProgressEntry",
        entityId: existing.id,
        action: "UPDATE",
        oldValue: existing,
        newValue: updated,
      });
      res.json(updated);
    }),
  );

  r.get(
    "/clients/:clientId/photos",
    asyncHandler(async (req: AuthedRequest, res) => {
      await assertClientAccessInline(req, paramId(req.params, "clientId"));
      const photos = await prisma.progressPhoto.findMany({
        where: { clientId: paramId(req.params, "clientId") },
        orderBy: { createdAt: "desc" },
      });
      res.json(photos);
    }),
  );

  const photoSchema = z.object({
    type: z.enum(["BEFORE", "AFTER", "WEEKLY"]),
    weekNumber: z.number().int().optional(),
    url: z.string().url(),
    publicId: z.string().optional(),
  });

  r.post(
    "/clients/:clientId/photos",
    asyncHandler(async (req: AuthedRequest, res) => {
      if (req.user!.role === "CLIENT") throw new AppError(403, "Forbidden");
      await assertClientAccessInline(req, paramId(req.params, "clientId"));
      const body = photoSchema.parse(req.body);
      const photo = await prisma.progressPhoto.create({
        data: {
          clientId: paramId(req.params, "clientId"),
          type: body.type,
          weekNumber: body.weekNumber,
          url: body.url,
          publicId: body.publicId,
          uploadedById: req.user!.id,
        },
      });
      await writeAudit({
        actorId: req.user!.id,
        entity: "ProgressPhoto",
        entityId: photo.id,
        action: "CREATE",
        newValue: photo,
      });
      res.status(201).json(photo);
    }),
  );

  return r;
}
