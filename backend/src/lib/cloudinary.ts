import { v2 as cloudinary } from "cloudinary";
import type { UploadApiOptions } from "cloudinary";
import type { Env } from "./env.js";

export function configureCloudinary(env: Env) {
  const cloud_name = env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = env.CLOUDINARY_API_KEY?.trim();
  const api_secret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name || !api_key || !api_secret) {
    return false;
  }
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
  });
  return true;
}

export async function uploadBuffer(buffer: Buffer, folder: string, extra?: UploadApiOptions) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        overwrite: false,
        invalidate: true,
        ...extra,
      },
      (err, result) => {
        if (err || !result) reject(err ?? new Error("Upload failed"));
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    uploadStream.end(buffer);
  });
}
