import { prisma } from "../lib/prisma.js";

export async function writeAudit(params: {
  actorId: string;
  entity: string;
  entityId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      oldValue: params.oldValue === undefined ? undefined : (params.oldValue as object),
      newValue: params.newValue === undefined ? undefined : (params.newValue as object),
    },
  });
}
