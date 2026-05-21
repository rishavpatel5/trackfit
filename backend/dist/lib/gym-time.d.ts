/**
 * Gym calendar days (midnight → midnight in GYM_TIMEZONE).
 * Not a rolling 24-hour window — 7pm Mon + 7am Tue are two different session days.
 */
export declare function getGymTimezone(): string;
/** `YYYY-MM-DD` in the gym's timezone. */
export declare function gymDateKey(date?: Date): string;
/** Stored on AttendanceRecord.sessionDate (@db.Date). UTC noon avoids off-by-one in Prisma. */
export declare function gymSessionDate(date?: Date): Date;
/** Last millisecond of the gym calendar day containing `date`. */
export declare function endOfGymSessionDay(date?: Date): Date;
export declare function formatGymDateLabel(date?: Date): string;
//# sourceMappingURL=gym-time.d.ts.map