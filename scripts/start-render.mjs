/**
 * Render production: API on $PORT (public), Discord bot after API is healthy.
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

async function waitForApiHealth(maxAttempts = 60, intervalMs = 1000) {
  const url = `${apiLocalUrl}/health`;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        console.log(`[start-render] API ready at ${url}`);
        return;
      }
      console.warn(
        `[start-render] API health ${res.status} (attempt ${attempt}/${maxAttempts})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[start-render] Waiting for API at ${url} (${attempt}/${maxAttempts}): ${message}`,
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`API did not become healthy at ${apiLocalUrl} within ${maxAttempts}s`);
}

const api = run("api", path.join(root, "apps/api/dist/index.js"));

console.log(`[start-render] API starting on port ${apiPort}; bot will use ${apiLocalUrl}`);

await waitForApiHealth();

const bot = run("discord-bot", path.join(root, "apps/discord-bot/dist/index.js"), {
  DISCORD_BOT_HTTP_ENABLED: "false",
  INTELLIGENCE_API_URL: apiLocalUrl,
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
