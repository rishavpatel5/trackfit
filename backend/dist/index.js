import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadEnv } from "./lib/env.js";
import { createApp } from "./app.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Load backend/.env even when the process cwd is the monorepo root. */
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const env = loadEnv();
const app = createApp(env);
app.listen(env.PORT, () => {
    console.log(`GVTrainer API listening on :${env.PORT}`);
});
//# sourceMappingURL=index.js.map