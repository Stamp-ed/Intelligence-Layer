import type { Client } from "discord.js";
import { config } from "../config.js";
import { isChannelEnabled } from "../services/channelRegistry.js";
import {
  finalizeMessageCursor,
  ingestDiscordMessage,
} from "../services/channelSyncService.js";
import {
  consecutiveFailureMessage,
  MAX_CONSECUTIVE_INGEST_FAILURES,
  recordIngestOutcome,
} from "../utils/ingestGuard.js";

let liveConsecutiveFailures = 0;
let liveIngestPaused = false;

export function registerMessageHandler(client: Client): void {
  if (!config.liveIngest) {
    return;
  }

  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.channel.isTextBased() || message.channel.isDMBased()) return;
    if (liveIngestPaused) return;

    const enabled = await isChannelEnabled(message.channel.id);
    if (!enabled) return;

    try {
      const result = await ingestDiscordMessage(message, "live");
      const outcome = recordIngestOutcome(liveConsecutiveFailures, result);
      liveConsecutiveFailures = outcome.consecutiveFailures;
      if (outcome.shouldAbort) {
        liveIngestPaused = true;
        console.error(
          `[discord-bot] live ingest paused: ${consecutiveFailureMessage(MAX_CONSECUTIVE_INGEST_FAILURES)}`,
        );
      } else if (
        result.newestMessageId &&
        (result.ingested > 0 || result.duplicates > 0)
      ) {
        await finalizeMessageCursor(message.channel.id, result.newestMessageId, "live");
      }
    } catch (err) {
      console.error("[discord-bot] live ingest error", err);
    }
  });
}
