import type { Client } from "discord.js";
import { config } from "../config.js";
import { getEnabledChannels } from "../services/channelRegistry.js";
import { pollChannel } from "../services/backfillService.js";

async function runPoll(client: Client): Promise<void> {
  console.log("[discord-bot] Starting scheduled poll");
  const channels = await getEnabledChannels();

  for (const sub of channels) {
    try {
      const channel = await client.channels.fetch(sub.channelId);
      if (!channel?.isTextBased() || channel.isDMBased()) {
        continue;
      }
      const stats = await pollChannel(channel);
      console.log(
        `[discord-bot] Polled #${sub.channelName ?? sub.channelId}: ingested=${stats.ingested} dup=${stats.duplicates} skip=${stats.skipped} fail=${stats.failed}`,
      );
    } catch (err) {
      console.error("[discord-bot] poll failed", sub.channelId, err);
    }
  }
}

export function startPollScheduler(client: Client): void {
  const hours = Math.max(1, config.pollIntervalHours);
  const ms = hours * 60 * 60 * 1000;

  void runPoll(client);
  setInterval(() => {
    void runPoll(client);
  }, ms);

  console.log(`[discord-bot] Poll scheduler active (every ${hours}h)`);
}
