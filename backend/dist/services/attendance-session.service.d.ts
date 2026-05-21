import type { ClientAttendanceStatus, Prisma, TrainerAttendanceStatus } from "@prisma/client";
/** @deprecated Use gymSessionDate from gym-time.ts */
export declare function startOfCalendarDay(date?: Date): Date;
/**
 * Package session policy:
 * - Trainer absent/rescheduled → never charge the client.
 * - Trainer present + client present → charge (completed session).
 * - Trainer present + client absent → charge (client no-show).
 */
export declare function computeSessionFlags(trainerStatus: TrainerAttendanceStatus, clientStatus: ClientAttendanceStatus): {
    sessionCompleted: boolean;
    sessionCharged: boolean;
};
export declare function countChargedSessions(clientId: string, tx?: Prisma.TransactionClient): Promise<number>;
/** Keep ProfileClient.sessionsCompleted aligned with charged attendance rows. */
export declare function syncSessionsCompleted(clientId: string, tx?: Prisma.TransactionClient): Promise<number>;
/**
 * When the gym calendar day changes, finalize older days:
 * - Trainer present + client never verified → client absent (charged).
 * - Trainer absent → closed without charge.
 */
export declare function closePastDaySessions(): Promise<void>;
//# sourceMappingURL=attendance-session.service.d.ts.map