import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { assertClientAccessInline } from "./access.js";
import { buildClientReportHtml, renderPdfFromHtml } from "../services/pdf.service.js";
import { configureCloudinary, uploadBuffer } from "../lib/cloudinary.js";
import { writeAudit } from "../services/audit.service.js";
import { paramId } from "./params.js";
export function reportsRouter(env) {
    const r = Router();
    r.use(authMiddleware(env));
    r.post("/clients/:clientId/pdf", asyncHandler(async (req, res) => {
        if (req.user.role === "CLIENT")
            throw new AppError(403, "Forbidden");
        const clientId = paramId(req.params, "clientId");
        await assertClientAccessInline(req, clientId);
        const html = await buildClientReportHtml(prisma, clientId);
        const pdfBuffer = Buffer.from(await renderPdfFromHtml(html));
        if (!configureCloudinary(env)) {
            throw new AppError(503, "Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to generate hosted PDF reports.");
        }
        const uploaded = await uploadBuffer(pdfBuffer, "gvtrainer/reports");
        const url = uploaded.secure_url;
        const row = await prisma.generatedReport.create({
            data: {
                clientId,
                url,
                generatedById: req.user.id,
            },
        });
        await writeAudit({
            actorId: req.user.id,
            entity: "GeneratedReport",
            entityId: row.id,
            action: "GENERATE_PDF",
        });
        res.status(201).json(row);
    }));
    r.get("/clients/:clientId", asyncHandler(async (req, res) => {
        const clientId = paramId(req.params, "clientId");
        await assertClientAccessInline(req, clientId);
        const rows = await prisma.generatedReport.findMany({
            where: { clientId },
            orderBy: { createdAt: "desc" },
        });
        res.json(rows);
    }));
    return r;
}
//# sourceMappingURL=reports.routes.js.map