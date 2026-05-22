/**
 * Gym calendar days (midnight → midnight in GYM_TIMEZONE).
 * Not a rolling 24-hour window — 7pm Mon + 7am Tue are two different session days.
 */

const DEFAULT_GYM_TIMEZONE = "Asia/Kolkata";

export function getGymTimezone(): string {
  return process.env.GYM_TIMEZONE?.trim() || DEFAULT_GYM_TIMEZONE;
}

/** `YYYY-MM-DD` in the gym's timezone. */
export function gymDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getGymTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Stored on AttendanceRecord.sessionDate (@db.Date). UTC noon avoids off-by-one in Prisma. */
export function gymSessionDate(date = new Date()): Date {
  const [y, m, d] = gymDateKey(date).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** Last millisecond of the gym calendar day containing `date`. */
export function endOfGymSessionDay(date = new Date()): Date {
  const startKey = gymDateKey(date);
  let endMs = date.getTime() + 30 * 60 * 1000;
  const limit = date.getTime() + 48 * 60 * 60 * 1000;

  while (gymDateKey(new Date(endMs)) === startKey && endMs < limit) {
    endMs += 30 * 60 * 1000;
  }

  while (gymDateKey(new Date(endMs)) !== startKey && endMs > date.getTime()) {
    endMs -= 60 * 1000;
  }

  return new Date(endMs);
}

export function formatGymDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: getGymTimezone(),
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
