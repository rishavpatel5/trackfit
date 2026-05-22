import { Router } from "express";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { assertClientAccessInline } from "./access.js";
import { buildClientReportHtml, renderPdfFromHtml } from "../services/pdf.service.js";
import { writeAudit } from "../services/audit.service.js";
import { paramId } from "./params.js";

export function reportsRouter(env: Env) {
  const r = Router();
  r.use(authMiddleware(env));

  r.post(
    "/clients/:clientId/pdf",
    asyncHandler(async (req: AuthedRequest, res) => {
      if (req.user!.role === "CLIENT") throw new AppError(403, "Forbidden");
      const clientId = paramId(req.params, "clientId");
      await assertClientAccessInline(req, clientId);

      const html = await buildClientReportHtml(prisma, clientId);
      const pdfBytes = await renderPdfFromHtml(html);

      await writeAudit({
        actorId: req.user!.id,
        entity: "Client",
        entityId: clientId,
        action: "GENERATE_PDF",
      });

      const filename = `gvtrainer-report-${clientId.slice(0, 8)}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Cache-Control", "private, no-store");
      res.send(Buffer.from(pdfBytes));
    }),
  );

  /** Legacy rows only — new PDF generation streams bytes and does not persist URLs. */
  r.get(
    "/clients/:clientId",
    asyncHandler(async (req: AuthedRequest, res) => {
      const clientId = paramId(req.params, "clientId");
      await assertClientAccessInline(req, clientId);
      const rows = await prisma.generatedReport.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      });
      res.json(rows);
    }),
  );

  return r;
}
