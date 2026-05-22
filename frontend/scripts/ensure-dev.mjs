import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
const inOneDrive = process.cwd().toLowerCase().includes("onedrive");

function removeNextDir() {
  if (!fs.existsSync(nextDir)) return;
  fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}

// OneDrive breaks Next.js symlinks under .next (EINVAL readlink).
if (inOneDrive) {
  console.log("[dev] OneDrive folder — clearing .next before start…");
  removeNextDir();
}
