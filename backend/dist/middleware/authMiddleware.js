import { AppError } from "../lib/AppError.js";
import { verifyToken } from "../lib/jwt.js";
export function authMiddleware(env) {
    return (req, _res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            return next(new AppError(401, "Missing or invalid authorization header"));
        }
        const token = header.slice("Bearer ".length);
        try {
            const payload = verifyToken(token, env.JWT_SECRET);
            req.user = { id: payload.sub, role: payload.role };
            return next();
        }
        catch {
            return next(new AppError(401, "Invalid or expired token"));
        }
    };
}
export function requireRoles(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            return next(new AppError(401, "Unauthorized"));
        if (!roles.includes(req.user.role)) {
            return next(new AppError(403, "Forbidden for this role"));
        }
        return next();
    };
}
//# sourceMappingURL=authMiddleware.js.map