import type { Response } from "express";
export declare function ensureClientReportToken(clientId: string): Promise<string>;
export declare function resolveClientIdByReportToken(token: string): Promise<{
    user: {
        firstName: string;
        lastName: string;
    };
    id: string;
}>;
export declare function buildClientReportPdf(clientId: string): Promise<Buffer<ArrayBuffer>>;
/** Strip helmet frame restrictions so the PDF can embed in the frontend viewer. */
export declare function allowPdfEmbedHeaders(res: Response): void;
export declare function streamClientReportPdf(clientId: string, res: Response, opts: {
    download: boolean;
    firstName: string;
    lastName: string;
}): Promise<void>;
//# sourceMappingURL=report.service.d.ts.map