import type { Client } from "discord.js";
import { config } from "../config.js";
import { isChannelEnabled } from "../services/channelRegistry.js";
import {
  finalizeMessageCursor,
  ingestDiscordMessage,
} from "../services/channelSyncService.js";

export function registerMessageHandler(client: Client): void {
  if (!config.liveIngest) {
    return;
  }

  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.channel.isTextBased() || message.channel.isDMBased()) return;

    const enabled = await isChannelEnabled(message.channel.id);
    if (!enabled) return;

    try {
      const result = await ingestDiscordMessage(message, "live");
      if (result.newestMessageId) {
        await finalizeMessageCursor(message.channel.id, result.newestMessageId, "live");
      }
    } catch (err) {
      console.error("[discord-bot] live ingest error", err);
    }
  });
}
