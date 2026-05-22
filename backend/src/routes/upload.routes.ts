import { Router } from "express";
import multer from "multer";
import type { Env } from "../lib/env.js";
import { authMiddleware, type AuthedRequest } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { configureCloudinary, uploadBuffer } from "../lib/cloudinary.js";
import { AppError } from "../lib/AppError.js";

const ALLOWED_IMAGE = /^image\/(jpeg|png|webp|gif)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

export function uploadRouter(env: Env) {
  const r = Router();
  r.use(authMiddleware(env));

  r.post(
    "/image",
    upload.single("file"),
    asyncHandler(async (req: AuthedRequest, res) => {
      if (!configureCloudinary(env)) {
        throw new AppError(503, "Cloudinary is not configured");
      }
      const file = req.file;
      if (!file) throw new AppError(400, "file field required");
      if (!ALLOWED_IMAGE.test(file.mimetype)) {
        throw new AppError(400, "Only JPEG, PNG, WebP, or GIF images are allowed");
      }

      const folder = String(req.body.folder ?? "gvtrainer/uploads");
      const uploaded = await uploadBuffer(file.buffer, folder, {
        resource_type: "image",
        transformation: [{ quality: "auto:good", fetch_format: "auto", flags: "progressive" }],
      });
      res.json({ url: uploaded.secure_url, publicId: uploaded.public_id });
    }),
  );

  return r;
}
