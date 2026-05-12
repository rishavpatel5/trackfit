import { prisma } from "../lib/prisma.js";
export async function writeAudit(params) {
    await prisma.auditLog.create({
        data: {
            actorId: params.actorId,
            entity: params.entity,
            entityId: params.entityId,
            action: params.action,
            oldValue: params.oldValue === undefined ? undefined : params.oldValue,
            newValue: params.newValue === undefined ? undefined : params.newValue,
        },
    });
}
//# sourceMappingURL=audit.service.js.map