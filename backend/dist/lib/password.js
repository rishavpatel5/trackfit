import bcrypt from "bcrypt";
import crypto from "crypto";
export async function hashPassword(plain, rounds) {
    return bcrypt.hash(plain, rounds);
}
export async function verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
}
export function generateNumericPin(length = 6) {
    const max = 10 ** length;
    const n = crypto.randomInt(0, max);
    return String(n).padStart(length, "0");
}
export function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}
//# sourceMappingURL=password.js.map