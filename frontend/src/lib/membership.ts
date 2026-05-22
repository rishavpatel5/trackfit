import { parseApiDate, todayDateKeyIST } from "./datetime";

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** One package session = one calendar day in IST (matches backend). */
export function membershipEndFromStartAndSessions(startDate: string, totalSessions: number): string | null {
  if (!startDate || totalSessions <= 0) return null;
  const base = parseApiDate(startDate);
  if (Number.isNaN(base.getTime())) return null;
  const end = new Date(base);
  end.setUTCDate(end.getUTCDate() + totalSessions - 1);
  return dateKey(end);
}

export function membershipEndAfterRenew(currentEnd: string | null | undefined, addSessions: number): string | null {
  if (addSessions <= 0) return null;
  const todayKey = todayDateKeyIST();
  const today = parseApiDate(todayKey);

  let base: Date;
  if (currentEnd) {
    const end = parseApiDate(currentEnd.slice(0, 10));
    base = end >= today ? end : today;
  } else {
    base = today;
  }

  if (!currentEnd || parseApiDate(currentEnd.slice(0, 10)) < today) {
    return membershipEndFromStartAndSessions(dateKey(base), addSessions);
  }

  const extended = new Date(base);
  extended.setUTCDate(extended.getUTCDate() + addSessions);
  return dateKey(extended);
}

export { formatDateIST as formatDisplayDate } from "./datetime";
