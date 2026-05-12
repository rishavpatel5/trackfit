import { prisma } from "../lib/prisma.js";
export async function notifyUser(input) {
    await prisma.notification.create({
        data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            metadata: input.metadata ? input.metadata : undefined,
        },
    });
}
//# sourceMappingURL=notification.service.js.map