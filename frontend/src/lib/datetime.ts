/** Indian Standard Time — all user-visible dates/times use this zone. */
export const IST_TIMEZONE = "Asia/Kolkata";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}/;

/** Parse API date-only (`YYYY-MM-DD`) or ISO datetime without timezone shift on display. */
export function parseApiDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const head = value.slice(0, 10);
  if (DATE_ONLY.test(head)) {
    const [y, m, d] = head.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  }
  return new Date(value);
}

/** Today as `YYYY-MM-DD` in IST (for form defaults / membership math). */
export function todayDateKeyIST(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** `dd/mm/yyyy` in IST. */
export function formatDateIST(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? parseApiDate(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Time in IST (12-hour, en-IN). */
export function formatTimeIST(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** `dd/mm/yyyy, h:mm am/pm` in IST. */
export function formatDateTimeIST(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  return `${formatDateIST(value)}, ${formatTimeIST(value)}`;
}
