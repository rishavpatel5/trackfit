import { gymSessionDate } from "../lib/gym-time.js";
import { formatDateIST } from "../lib/datetime-format.js";

/** One package session = one calendar day (inclusive window). */
export function membershipEndFromStartAndSessions(start: Date, totalSessions: number): Date {
  const base = gymSessionDate(start);
  if (totalSessions <= 0) return base;
  const end = new Date(base);
  end.setUTCDate(end.getUTCDate() + totalSessions - 1);
  return end;
}

/** Extend membership when renewing — adds session-days to the current or new window. */
export function membershipEndAfterRenew(currentEnd: Date | null, addSessions: number): Date {
  if (addSessions <= 0) {
    throw new Error("addSessions must be positive");
  }
  const today = gymSessionDate();
  const endDay = currentEnd ? gymSessionDate(currentEnd) : null;

  if (!endDay || endDay < today) {
    return membershipEndFromStartAndSessions(today, addSessions);
  }

  const extended = new Date(endDay);
  extended.setUTCDate(extended.getUTCDate() + addSessions);
  return extended;
}

export function formatDateOnly(d: Date): string {
  return formatDateIST(d);
}
