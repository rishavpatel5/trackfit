import type { Role } from "@prisma/client";
export type JwtPayload = {
    sub: string;
    role: Role;
};
export declare function signToken(payload: JwtPayload, secret: string, expiresIn: string): string;
export declare function verifyToken(token: string, secret: string): JwtPayload;
//# sourceMappingURL=jwt.d.ts.map