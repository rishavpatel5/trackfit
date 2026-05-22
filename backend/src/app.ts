import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import type { Env } from "./lib/env.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { trainersRouter } from "./routes/trainers.routes.js";
import { clientsRouter } from "./routes/clients.routes.js";
import { attendanceRouter } from "./routes/attendance.routes.js";
import { workoutsRouter } from "./routes/workouts.routes.js";
import { dietsRouter } from "./routes/diets.routes.js";
import { measurementsRouter } from "./routes/measurements.routes.js";
import { progressRouter } from "./routes/progress.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";

export function createApp(env: Env) {
  const app = express();
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(compression({ threshold: 2048 }));
  app.use(express.json({ limit: "2mb" }));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "gvtrainer-api" });
  });

  app.use("/auth", authRouter(env));
  app.use("/dashboard", dashboardRouter(env));
  app.use("/trainers", trainersRouter(env));
  app.use("/clients", clientsRouter(env));
  app.use("/attendance", attendanceRouter(env));
  app.use("/workouts", workoutsRouter(env));
  app.use("/diets", dietsRouter(env));
  app.use("/measurements", measurementsRouter(env));
  app.use("/progress", progressRouter(env));
  app.use("/reports", reportsRouter(env));
  app.use("/notifications", notificationsRouter(env));
  app.use("/audit", auditRouter(env));
  app.use("/upload", uploadRouter(env));

  app.use(errorMiddleware);

  return app;
}
