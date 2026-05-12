import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { verifyPassword, hashPassword, hashToken } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { AppError } from "../lib/AppError.js";
import crypto from "crypto";
export function authRouter(env) {
    const r = Router();
    const loginLimiter = rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
    });
    const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
    });
    r.post("/login", loginLimiter, asyncHandler(async (req, res) => {
        const body = loginSchema.parse(req.body);
        const user = await prisma.user.findUnique({
            where: { email: body.email.toLowerCase() },
            include: { trainer: true, client: true },
        });
        if (!user || !user.active)
            throw new AppError(401, "Invalid credentials");
        const ok = await verifyPassword(body.password, user.passwordHash);
        if (!ok)
            throw new AppError(401, "Invalid credentials");
        const token = signToken({ sub: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                trainerId: user.trainer?.id,
                clientId: user.client?.id,
            },
        });
    }));
    const forgotSchema = z.object({ email: z.string().email() });
    r.post("/forgot-password", loginLimiter, asyncHandler(async (req, res) => {
        const { email } = forgotSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            return res.json({ message: "If the account exists, reset instructions were sent." });
        }
        const raw = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(raw);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
        });
        const payload = {
            message: "If the account exists, reset instructions were sent.",
        };
        if (env.NODE_ENV === "development" || env.RETURN_RESET_TOKEN) {
            payload.resetToken = raw;
        }
        res.json(payload);
    }));
    const resetSchema = z.object({
        token: z.string().min(10),
        newPassword: z.string().min(8),
    });
    r.post("/reset-password", loginLimiter, asyncHandler(async (req, res) => {
        const body = resetSchema.parse(req.body);
        const tokenHash = hashToken(body.token);
        const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
        if (!record || record.expiresAt < new Date())
            throw new AppError(400, "Invalid or expired token");
        const passwordHash = await hashPassword(body.newPassword, env.BCRYPT_ROUNDS);
        await prisma.user.update({
            where: { id: record.userId },
            data: { passwordHash },
        });
        await prisma.passwordResetToken.delete({ where: { id: record.id } });
        res.json({ message: "Password updated" });
    }));
    r.get("/me", authMiddleware(env), asyncHandler(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { trainer: true, client: true },
        });
        if (!user)
            throw new AppError(404, "User not found");
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            active: user.active,
            trainerId: user.trainer?.id,
            clientId: user.client?.id,
        });
    }));
    return r;
}
//# sourceMappingURL=auth.routes.js.map