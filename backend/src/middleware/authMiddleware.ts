import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";
import { verifyToken } from "../lib/jwt.js";
import type { Env } from "../lib/env.js";
import type { Role } from "@prisma/client";

export type AuthedRequest = Request & {
  user?: { id: string; role: Role };
};

export function authMiddleware(env: Env) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new AppError(401, "Missing or invalid authorization header"));
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = verifyToken(token, env.JWT_SECRET);
      req.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return next(new AppError(401, "Invalid or expired token"));
    }
  };
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Unauthorized"));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Forbidden for this role"));
    }
    return next();
  };
}
