import type { AuthedRequest } from "../middleware/authMiddleware.js";
import { AppError } from "../lib/AppError.js";
import { prisma } from "../lib/prisma.js";
import type { Response } from "express";

export async function requireUserProfile(req: AuthedRequest) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { trainer: true, client: true },
  });
  if (!user) throw new AppError(401, "User not found");
  return user;
}

export async function getTrainerProfileId(userId: string) {
  const t = await prisma.profileTrainer.findUnique({ where: { userId } });
  if (!t) throw new AppError(403, "Trainer profile missing");
  return t.id;
}

export async function getClientProfileId(userId: string) {
  const c = await prisma.profileClient.findUnique({ where: { userId } });
  if (!c) throw new AppError(403, "Client profile missing");
  return c.id;
}

export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function sendList<T>(res: Response, rows: T[], total: number, page: number, pageSize: number) {
  return res.json({ data: rows, total, page, pageSize });
}
