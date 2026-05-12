import type { PrismaClient } from "@prisma/client";
export declare function buildClientReportHtml(prisma: PrismaClient, clientId: string): Promise<string>;
export declare function renderPdfFromHtml(html: string): Promise<Uint8Array<ArrayBufferLike>>;
//# sourceMappingURL=pdf.service.d.ts.map