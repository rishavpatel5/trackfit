import type { NextFunction, Request, Response } from "express";
export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;
export declare function asyncHandler(fn: AsyncRequestHandler): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=asyncHandler.d.ts.map