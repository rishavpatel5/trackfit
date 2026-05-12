import { v2 as cloudinary } from "cloudinary";
export function configureCloudinary(env) {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        return false;
    }
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
    });
    return true;
}
export async function uploadBuffer(buffer, folder, publicId) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder,
            public_id: publicId,
            resource_type: "auto",
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