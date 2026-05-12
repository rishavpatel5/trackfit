import type { NotificationType } from "@prisma/client";
export declare function notifyUser(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
}): Promise<void>;
//# sourceMappingURL=notification.service.d.ts.map