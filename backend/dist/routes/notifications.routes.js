import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { parsePagination, sendList } from "./helpers.js";
import { paramId } from "./params.js";
export function notificationsRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.get("/", asyncHandler(async (req, res) => {
        const { skip, take, page, pageSize } = parsePagination(req.query);
        const unreadOnly = req.query.unread === "true";
        const where = {
            userId: req.user.id,
            ...(unreadOnly ? { read: false } : {}),
        };
        const [rows, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            prisma.notification.count({ where }),
        ]);
        sendList(res, rows, total, page, pageSize);
    }));
    r.patch("/:id/read", asyncHandler(async (req, res) => {
        const note = await prisma.notification.findFirst({
            where: { id: paramId(req.params, "id"), userId: req.user.id },
        });
        if (!note)
            return res.status(404).json({ error: "Not found" });
        const updated = await prisma.notification.update({
            where: { id: note.id },
            data: { read: true },
        });
        res.json(updated);
    }));
    return r;
}
//# sourceMappingURL=notifications.routes.js.map