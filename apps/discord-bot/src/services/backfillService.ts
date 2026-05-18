import type { Message, TextBasedChannel } from "discord.js";
import { getCursor, updateCursor } from "./channelRegistry.js";
import {
  finalizeMessageCursor,
  ingestDiscordMessage,
  mergeStats,
  type IngestMode,
  type SyncStats,
} from "./channelSyncService.js";
import { collectMessageAttachments } from "../utils/attachmentUtils.js";
import { sleep } from "../utils/rateLimit.js";

export type BackfillMode = "all" | "files" | "since";

export interface BackfillOptions {
  mode: BackfillMode;
  limit?: number;
  since?: Date;
  onProgress?: (processed: number, stats: SyncStats) => void;
}

export interface BackfillResult extends SyncStats {
  intentWarning?: string;
}

async function fetchAllMessages(
  channel: TextBasedChannel,
  options: BackfillOptions,
): Promise<Message[]> {
  const limit = options.limit ?? 5000;
  const collected: Message[] = [];
  let before: string | undefined;

  let iterations = 0;
  const maxIterations = Math.ceil(limit / 100) + 5;

  while (collected.length < limit && iterations < maxIterations) {
    iterations += 1;
    const batch = await channel.messages.fetch({
      limit: Math.min(100, limit - collected.length),
      before,
    });
    if (batch.size === 0) break;

    const sorted = [...batch.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );

    let batchHasNewer = false;
    for (const msg of sorted) {
      if (options.since && msg.createdAt < options.since) {
        continue;
      }
      batchHasNewer = true;
      collected.push(msg);
      if (collected.length >= limit) break;
    }

    if (options.since && !batchHasNewer && sorted.length > 0) {
      return collected;
    }

    before = sorted[0]?.id;
    await sleep(500);
  }

  return collected;
}

async function fetchMessagesAfterCursor(
  channel: TextBasedChannel,
  afterId: string | null,
  limit: number,
): Promise<Message[]> {
  if (!afterId) {
    const batch = await channel.messages.fetch({ limit: Math.min(100, limit) });
    return [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  }

  const collected: Message[] = [];
  let after = afterId;

  while (collected.length < limit) {
    const batch = await channel.messages.fetch({
      limit: Math.min(100, limit - collected.length),
      after,
    });
    if (batch.size === 0) break;

    const sorted = [...batch.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );
    collected.push(...sorted);
    after = sorted[sorted.length - 1]?.id;
    await sleep(500);
  }

  return collected;
}

function detectIntentGap(messages: Message[]): string | undefined {
  const human = messages.filter((m) => !m.author.bot);
  if (human.length === 0) return undefined;

  const empty = human.filter(
    (m) =>
      !m.content?.trim() &&
      m.attachments.size === 0 &&
      m.embeds.length === 0 &&
      collectMessageAttachments(m).length === 0,
  );

  if (empty.length >= Math.max(1, Math.floor(human.length * 0.8))) {
    return (
      "Discord returned empty messages (no text, no attachments). " +
      "Enable **Message Content Intent** for your bot in the Discord Developer Portal " +
      "(Bot → Privileged Gateway Intents → Message Content Intent), then restart the bot."
    );
  }

  return undefined;
}

export async function runChannelBackfill(
  channel: TextBasedChannel,
  options: BackfillOptions,
): Promise<BackfillResult> {
  const stats: BackfillResult = {
    ingested: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0,
    skippedBot: 0,
    skippedNoContent: 0,
    skippedUnsupported: 0,
  };
  const ingestMode: IngestMode = "backfill";
  const filesOnly = options.mode === "files";

  const messages =
    options.mode === "since" || options.mode === "all" || options.mode === "files"
      ? await fetchAllMessages(channel, options)
      : [];

  stats.messagesScanned = messages.length;
  stats.intentWarning = detectIntentGap(messages);

  let processed = 0;
  let newestId: string | undefined;

  for (const message of messages) {
    if (message.author.bot) {
      stats.skipped += 1;
      stats.skippedBot = (stats.skippedBot ?? 0) + 1;
      continue;
    }

    let fullMessage = message;
    try {
      fullMessage = await message.fetch();
    } catch {
      // use cached message
    }

    const resolved = collectMessageAttachments(fullMessage);
    if (resolved.length > 0) {
      console.log(
        `[discord-bot] msg ${fullMessage.id}: ${resolved.map((a) => a.fileName).join(", ")}`,
      );
    } else if (fullMessage.attachments.size > 0) {
      console.warn(
        `[discord-bot] msg ${fullMessage.id}: raw attachments=${fullMessage.attachments.size} but none resolved`,
        [...fullMessage.attachments.values()].map((a) => ({
          name: a.name,
          type: a.contentType,
        })),
      );
    }

    const result = await ingestDiscordMessage(fullMessage, ingestMode, { filesOnly });
    mergeStats(stats, result);
    newestId = fullMessage.id;
    processed += 1;
    options.onProgress?.(processed, stats);
  }

  if (newestId) {
    await finalizeMessageCursor(channel.id, newestId, ingestMode);
  } else {
    await updateCursor(channel.id, (await getCursor(channel.id)) ?? "", {
      backfill: true,
    });
  }

  return stats;
}

export async function pollChannel(channel: TextBasedChannel): Promise<SyncStats> {
  const stats: SyncStats = { ingested: 0, duplicates: 0, skipped: 0, failed: 0 };
  const afterId = await getCursor(channel.id);
  const messages = await fetchMessagesAfterCursor(channel, afterId, 500);

  if (messages.length === 0) {
    await updateCursor(channel.id, afterId ?? "", { poll: true });
    return stats;
  }

  let newestId = afterId ?? undefined;

  for (const message of messages) {
    if (message.author.bot) continue;
    let fullMessage = message;
    try {
      fullMessage = await message.fetch();
    } catch {
      // keep cached
    }
    const result = await ingestDiscordMessage(fullMessage, "poll");
    mergeStats(stats, result);
    newestId = fullMessage.id;
  }

  if (newestId) {
    await finalizeMessageCursor(channel.id, newestId, "poll");
  }

  return stats;
}
