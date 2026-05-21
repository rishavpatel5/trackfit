import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/AppError.js";
import { buildClientReportHtml, renderPdfFromHtml } from "./pdf.service.js";
export async function ensureClientReportToken(clientId) {
    const existing = await prisma.profileClient.findUnique({
        where: { id: clientId },
        select: { reportToken: true },
    });
    if (!existing)
        throw new AppError(404, "Client not found");
    if (existing.reportToken)
        return existing.reportToken;
    const token = randomUUID();
    await prisma.profileClient.update({
        where: { id: clientId },
        data: { reportToken: token },
    });
    return token;
}
export async function resolveClientIdByReportToken(token) {
    const client = await prisma.profileClient.findUnique({
        where: { reportToken: token },
        select: { id: true, user: { select: { firstName: true, lastName: true } } },
    });
    if (!client)
        throw new AppError(404, "Report not found");
    return client;
}
export async function buildClientReportPdf(clientId) {
    const html = await buildClientReportHtml(prisma, clientId);
    return Buffer.from(await renderPdfFromHtml(html));
}
function pdfFilename(firstName, lastName) {
    const safe = `${firstName}-${lastName}`.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
    return `transformation-report-${safe || "client"}.pdf`;
}
/** Strip helmet frame restrictions so the PDF can embed in the frontend viewer. */
export function allowPdfEmbedHeaders(res) {
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}
export async function streamClientReportPdf(clientId, res, opts) {
    const pdfBuffer = await buildClientReportPdf(clientId);
    const filename = pdfFilename(opts.firstName, opts.lastName);
    allowPdfEmbedHeaders(res);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdfBuffer.length));
    res.setHeader("Content-Disposition", opts.download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(pdfBuffer);
}
//# sourceMappingURL=report.service.js.map