import { v2 as cloudinary } from "cloudinary";
export function configureCloudinary(env) {
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
export async function uploadBuffer(buffer, folder, extra) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder,
            resource_type: "auto",
            overwrite: false,
            invalidate: true,
            ...extra,
        }, (err, result) => {
            if (err || !result)
                reject(err ?? new Error("Upload failed"));
            else
                resolve({ secure_url: result.secure_url, public_id: result.public_id });
        });
        uploadStream.end(buffer);
    });
}
//# sourceMappingURL=cloudinary.js.map