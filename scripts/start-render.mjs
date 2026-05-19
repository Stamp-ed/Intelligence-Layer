/**
 * Render production: API on $PORT (public), Discord bot without HTTP (no port conflict).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = process.env.PORT ?? "8000";
const apiLocalUrl = `http://127.0.0.1:${apiPort}`;

function run(name, scriptPath, extraEnv = {}) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: root,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: "inherit",
  });
  child.on("error", (err) => {
    console.error(`[start-render] Failed to start ${name}:`, err);
    process.exit(1);
  });
  return child;
}

const api = run("api", path.join(root, "apps/api/dist/index.js"));
const bot = run("discord-bot", path.join(root, "apps/discord-bot/dist/index.js"), {
  DISCORD_BOT_HTTP_ENABLED: "false",
  INTELLIGENCE_API_URL: process.env.INTELLIGENCE_API_URL ?? apiLocalUrl,
});

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill("SIGTERM");
  bot.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500).unref();
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

api.on("exit", (code, signal) => {
  if (shuttingDown) return;
  console.error(`[start-render] API exited (code=${code}, signal=${signal})`);
  bot.kill("SIGTERM");
  process.exit(code ?? 1);
});

bot.on("exit", (code, signal) => {
  if (shuttingDown) return;
  console.error(`[start-render] Discord bot exited (code=${code}, signal=${signal})`);
  api.kill("SIGTERM");
  process.exit(code ?? 1);
});
