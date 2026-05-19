import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/**
 * Bot → API base URL.
 * On Render (co-located via start-render.mjs), always use 127.0.0.1:$PORT — dashboard
 * values like http://localhost:8000 cause ECONNREFUSED when PORT is not 8000.
 * For a separate bot service, set INTELLIGENCE_API_URL to the public API URL (https://…).
 */
function resolveIntelligenceApiUrl(): string {
  const port = process.env.PORT ?? process.env.API_PORT ?? "8000";
  const fromEnv = process.env.INTELLIGENCE_API_URL?.trim();

  if (fromEnv) {
    try {
      const parsed = new URL(fromEnv);
      if (process.env.RENDER && isLoopbackHost(parsed.hostname)) {
        const fixed = `http://127.0.0.1:${port}`;
        if (fromEnv.replace(/\/$/, "") !== fixed) {
          console.warn(
            `[discord-bot] INTELLIGENCE_API_URL=${fromEnv} ignored on Render; using ${fixed}`,
          );
        }
        return fixed;
      }
      return fromEnv.replace(/\/$/, "");
    } catch {
      console.warn(`[discord-bot] Invalid INTELLIGENCE_API_URL "${fromEnv}", using 127.0.0.1:${port}`);
    }
  }

  if (process.env.RENDER || process.env.NODE_ENV === "production") {
    return `http://127.0.0.1:${port}`;
  }

  return `http://localhost:8000`;
}

export const config = {
  discordBotToken: required("DISCORD_BOT_TOKEN"),
  discordClientId: required("DISCORD_CLIENT_ID"),
  discordGuildId: process.env.DISCORD_GUILD_ID ?? "",
  discordCommandRoleIds: (process.env.DISCORD_COMMAND_ROLE_IDS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean),

  intelligenceApiUrl: resolveIntelligenceApiUrl(),
  apiSecretKey: process.env.API_SECRET_KEY ?? "",

  pollIntervalHours: parseInt(process.env.DISCORD_POLL_INTERVAL_HOURS ?? "6", 10),
  liveIngest: (process.env.DISCORD_LIVE_INGEST ?? "false").toLowerCase() === "true",
  minMessageChars: parseInt(process.env.DISCORD_MIN_MESSAGE_CHARS ?? "20", 10),
  maxAttachmentMb: parseInt(process.env.DISCORD_MAX_ATTACHMENT_MB ?? "25", 10),

  port: parseInt(process.env.DISCORD_BOT_PORT ?? "3001", 10),
};
