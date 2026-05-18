import { Client, GatewayIntentBits, Partials } from "discord.js";
import { config } from "./config.js";

export function createDiscordClient(): Client {
  // Message Content intent is REQUIRED for REST message history to include
  // content, embeds, and attachments (Discord API policy for bots).
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ];

  if (config.liveIngest) {
    console.log("[discord-bot] Live ingest enabled (messageCreate handler active)");
  }

  return new Client({
    intents,
    partials: [Partials.Channel],
  });
}
