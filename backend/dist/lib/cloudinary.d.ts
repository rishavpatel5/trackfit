import type { UploadApiOptions } from "cloudinary";
import type { Env } from "./env.js";
export declare function configureCloudinary(env: Env): boolean;
export declare function uploadBuffer(buffer: Buffer, folder: string, extra?: UploadApiOptions): Promise<{
    secure_url: string;
    public_id: string;
}>;
//# sourceMappingURL=cloudinary.d.ts.map