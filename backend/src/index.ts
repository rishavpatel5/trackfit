import "dotenv/config";
import { loadEnv } from "./lib/env.js";
import { createApp } from "./app.js";
import { closePastDaySessions } from "./services/attendance-session.service.js";

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
