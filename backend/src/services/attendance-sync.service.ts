import { prisma } from "../lib/prisma.js";

/** Single source of truth: completed check-ins in the ledger. */
export async function syncClientSessionsCompletedFromLedger(clientId: string): Promise<number> {
  const count = await prisma.attendanceRecord.count({
    where: { clientId, sessionCompleted: true },
  });
  await prisma.profileClient.update({
    where: { id: clientId },
    data: { sessionsCompleted: count },
  });
  return count;
}
