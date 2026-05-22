import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  /** Session/direct Postgres URL (Supabase :5432). Defaults to DATABASE_URL when omitted (local dev). */
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  /** Optional transactional email (https://resend.com — free tier). When unset, forgot-password stays JSON-only in prod. */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.preprocess((val) => (val === "" || val === undefined ? undefined : val), z.string().email().optional()),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  ATTENDANCE_PIN_EXPIRY_MINUTES: z.coerce.number().default(20),
  /** IANA timezone for session calendar days (e.g. Asia/Kolkata). */
  GYM_TIMEZONE: z.string().default("Asia/Kolkata"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  RETURN_RESET_TOKEN: z.coerce.boolean().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  const du = (process.env.DIRECT_URL ?? "").trim();
  if (!du && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}
