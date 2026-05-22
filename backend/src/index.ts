import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadEnv } from "./lib/env.js";
import { createApp } from "./app.js";
import { closePastDaySessions } from "./services/attendance-session.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Load backend/.env even when the process cwd is the monorepo root. */
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const env = loadEnv();
const app = createApp(env);

const DAY_MS = 24 * 60 * 60 * 1000;

async function runAttendanceDayClose() {
  try {
    await closePastDaySessions();
  } catch (err) {
    console.error("Attendance day-close failed:", err);
  }
}

void runAttendanceDayClose();
setInterval(() => void runAttendanceDayClose(), DAY_MS);

app.listen(env.PORT, () => {
  console.log(`GVTrainer API listening on :${env.PORT}`);
});
