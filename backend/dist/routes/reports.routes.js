import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ensureClientReportToken, resolveClientIdByReportToken, streamClientReportPdf, } from "../services/report.service.js";
import { assertClientAccessInline } from "./access.js";
import { paramId } from "./params.js";
export function reportsRouter(env) {
    const r = Router();
    r.get("/public/:token", asyncHandler(async (req, res) => {
        const token = String(req.params.token ?? "");
        const client = await resolveClientIdByReportToken(token);
        const download = req.query.download === "1" || req.query.download === "true";
        await streamClientReportPdf(client.id, res, {
            download,
            firstName: client.user.firstName,
            lastName: client.user.lastName,
        });
    }));
    r.use(authMiddleware(env));
    r.get("/clients/:clientId", asyncHandler(async (req, res) => {
        const clientId = paramId(req.params, "clientId");
        await assertClientAccessInline(req, clientId);
        const token = await ensureClientReportToken(clientId);
        res.json({
            token,
            publicPath: `/report/${token}`,
            live: true,
            description: "PDF is generated on each view with the latest client data.",
        });
    }));
    r.get("/clients/:clientId/pdf", asyncHandler(async (req, res) => {
        const clientId = paramId(req.params, "clientId");
        await assertClientAccessInline(req, clientId);
        const download = req.query.download === "1" || req.query.download === "true";
        const profile = await prisma.profileClient.findUnique({
            where: { id: clientId },
            select: { user: { select: { firstName: true, lastName: true } } },
        });
        if (!profile)
            throw new Error("Client not found");
        await streamClientReportPdf(clientId, res, {
            download,
            firstName: profile.user.firstName,
            lastName: profile.user.lastName,
        });
    }));
    return r;
}
//# sourceMappingURL=reports.routes.js.map