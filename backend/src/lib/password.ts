import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Env } from "./env.js";

export async function hashPassword(plain: string, rounds: Env["BCRYPT_ROUNDS"]) {
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function generateNumericPin(length = 6) {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(length, "0");
}

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
