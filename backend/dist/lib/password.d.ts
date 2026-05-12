import type { Env } from "./env.js";
export declare function hashPassword(plain: string, rounds: Env["BCRYPT_ROUNDS"]): Promise<string>;
export declare function verifyPassword(plain: string, hash: string): Promise<boolean>;
export declare function generateNumericPin(length?: number): string;
export declare function hashToken(raw: string): string;
//# sourceMappingURL=password.d.ts.map