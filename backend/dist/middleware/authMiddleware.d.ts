import type { NextFunction, Request, Response } from "express";
import type { Env } from "../lib/env.js";
import type { Role } from "@prisma/client";
export type AuthedRequest = Request & {
    user?: {
        id: string;
        role: Role;
    };
};
export declare function authMiddleware(env: Env): (req: AuthedRequest, _res: Response, next: NextFunction) => void;
export declare function requireRoles(...roles: Role[]): (req: AuthedRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=authMiddleware.d.ts.map