import { AppError } from "../lib/AppError.js";
import { ZodError } from "zod";
export function errorMiddleware(err, _req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    if (err instanceof ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
}
//# sourceMappingURL=errorMiddleware.js.map