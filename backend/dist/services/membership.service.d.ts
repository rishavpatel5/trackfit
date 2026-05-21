/** One package session = one calendar day (inclusive window). */
export declare function membershipEndFromStartAndSessions(start: Date, totalSessions: number): Date;
/** Extend membership when renewing — adds session-days to the current or new window. */
export declare function membershipEndAfterRenew(currentEnd: Date | null, addSessions: number): Date;
export declare function formatDateOnly(d: Date): string;
//# sourceMappingURL=membership.service.d.ts.map