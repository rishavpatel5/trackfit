import { Router } from "express";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireRoles, type AuthedRequest } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { parsePagination, sendList } from "./helpers.js";

export function auditRouter(env: Env) {
  const r = Router();
  r.use(authMiddleware(env));
  r.use(requireRoles("ADMIN"));

  r.get(
    "/",
    asyncHandler(async (req: AuthedRequest, res) => {
      const { skip, take, page, pageSize } = parsePagination(req.query as Record<string, unknown>);
      const entity = req.query.entity ? String(req.query.entity) : undefined;
      const where = entity ? { entity } : {};
      const [rows, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            actor: { select: { id: true, email: true, role: true, firstName: true, lastName: true } },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);
      sendList(res, rows, total, page, pageSize);
    }),
  );

  return r;
}
