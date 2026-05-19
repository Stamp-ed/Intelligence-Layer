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

/** Same host the API listens on when bot + API run via scripts/start-render.mjs on Render */
function resolveIntelligenceApiUrl(): string {
  const fromEnv = process.env.INTELLIGENCE_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const port = process.env.PORT ?? process.env.API_PORT ?? "8000";
  const onRender = Boolean(process.env.RENDER);
  const isProduction = process.env.NODE_ENV === "production";

  if (onRender || isProduction) {
    return `http://127.0.0.1:${port}`;
  }

  return `http://localhost:${port === "8000" ? "8000" : port}`;
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
