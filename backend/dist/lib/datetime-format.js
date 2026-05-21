import { getGymTimezone } from "./gym-time.js";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}/;
function parseDisplayDate(value) {
    if (value instanceof Date)
        return value;
    const head = value.slice(0, 10);
    if (DATE_ONLY.test(head)) {
        const [y, m, d] = head.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
    }
    return new Date(value);
}
/** `dd/mm/yyyy` in gym timezone (default IST). */
export function formatDateIST(value) {
    if (value == null)
        return "";
    const d = parseDisplayDate(value);
    if (Number.isNaN(d.getTime()))
        return "";
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: getGymTimezone(),
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
}
/** Time in gym timezone (12-hour). */
export function formatTimeIST(value) {
    if (value == null)
        return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime()))
        return "";
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: getGymTimezone(),
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(d);
}
export function formatDateTimeIST(value) {
    if (value == null)
        return "";
    return `${formatDateIST(value)}, ${formatTimeIST(value)}`;
}
//# sourceMappingURL=datetime-format.js.map