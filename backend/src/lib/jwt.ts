import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  role: Role;
};

export function signToken(payload: JwtPayload, secret: string, expiresIn: string) {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export function verifyToken(token: string, secret: string): JwtPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded !== "object" || decoded === null || !("sub" in decoded) || !("role" in decoded)) {
    throw new Error("Invalid token payload");
  }
  return decoded as JwtPayload;
}
