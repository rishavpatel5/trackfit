import { gymSessionDate } from "../lib/gym-time.js";
import { prisma } from "../lib/prisma.js";
/** @deprecated Use gymSessionDate from gym-time.ts */
export function startOfCalendarDay(date = new Date()) {
    return gymSessionDate(date);
}
/**
 * Package session policy:
 * - Trainer absent/rescheduled → never charge the client.
 * - Trainer present + client present → charge (completed session).
 * - Trainer present + client absent → charge (client no-show).
 */
export function computeSessionFlags(trainerStatus, clientStatus) {
    if (trainerStatus !== "PRESENT") {
        return { sessionCompleted: false, sessionCharged: false };
    }
    if (clientStatus === "PRESENT") {
        return { sessionCompleted: true, sessionCharged: true };
    }
    if (clientStatus === "ABSENT") {
        return { sessionCompleted: false, sessionCharged: true };
    }
    return { sessionCompleted: false, sessionCharged: false };
}
export async function countChargedSessions(clientId, tx) {
    const db = tx ?? prisma;
    return db.attendanceRecord.count({
        where: { clientId, sessionCharged: true },
    });
}
/** Keep ProfileClient.sessionsCompleted aligned with charged attendance rows. */
export async function syncSessionsCompleted(clientId, tx) {
    const db = tx ?? prisma;
    const count = await countChargedSessions(clientId, db);
    await db.profileClient.update({
        where: { id: clientId },
        data: { sessionsCompleted: count },
    });
    return count;
}
/**
 * When the gym calendar day changes, finalize older days:
 * - Trainer present + client never verified → client absent (charged).
 * - Trainer absent → closed without charge.
 */
export async function closePastDaySessions() {
    const today = gymSessionDate();
    const noShows = await prisma.attendanceRecord.findMany({
        where: {
            sessionDate: { lt: today },
            clientStatus: "PENDING",
            trainerStatus: "PRESENT",
        },
        select: { id: true, clientId: true },
    });
    for (const row of noShows) {
        const flags = computeSessionFlags("PRESENT", "ABSENT");
        await prisma.attendanceRecord.update({
            where: { id: row.id },
            data: { clientStatus: "ABSENT", ...flags },
        });
        await syncSessionsCompleted(row.clientId);
    }
    await prisma.attendanceRecord.updateMany({
        where: {
            sessionDate: { lt: today },
            clientStatus: "PENDING",
            trainerStatus: { in: ["ABSENT", "RESCHEDULED"] },
        },
        data: {
            clientStatus: "ABSENT",
            sessionCompleted: false,
            sessionCharged: false,
        },
    });
}
//# sourceMappingURL=attendance-session.service.js.map