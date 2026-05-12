import type { AuthedRequest } from "../middleware/authMiddleware.js";
import { AppError } from "../lib/AppError.js";
import { prisma } from "../lib/prisma.js";
import { getTrainerProfileId } from "./helpers.js";

export async function assertClientAccessInline(req: AuthedRequest, clientId: string) {
  const role = req.user!.role;
  if (role === "ADMIN") return;
  if (role === "CLIENT") {
    const mine = await prisma.profileClient.findFirst({ where: { id: clientId, userId: req.user!.id } });
    if (!mine) throw new AppError(403, "Forbidden");
    return;
  }
  if (role === "TRAINER") {
    const tid = await getTrainerProfileId(req.user!.id);
    const c = await prisma.profileClient.findFirst({ where: { id: clientId, trainerId: tid } });
    if (!c) throw new AppError(403, "Forbidden");
  }
}
