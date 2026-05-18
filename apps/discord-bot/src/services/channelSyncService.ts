import type { Message } from "discord.js";
import { config } from "../config.js";
import { updateCursor } from "./channelRegistry.js";
import { ingestFile, ingestText } from "./intelligenceClient.js";
import {
  channelLabel,
  formatDiscordMessage,
  messageJumpUrl,
} from "./messageFormatter.js";
import {
  collectMessageAttachments,
  downloadDiscordAsset,
} from "../utils/attachmentUtils.js";
import { maxAttachmentBytes } from "../utils/validation.js";
import { sleep } from "../utils/rateLimit.js";

export type IngestMode = "poll" | "live" | "backfill";

export interface SyncStats {
  ingested: number;
  duplicates: number;
  skipped: number;
  failed: number;
  messagesScanned?: number;
  skippedBot?: number;
  skippedNoContent?: number;
  skippedUnsupported?: number;
  intentWarning?: string;
}

export interface SyncMessageResult {
  ingested: number;
  duplicates: number;
  skipped: number;
  failed: number;
  skippedNoContent?: number;
  skippedUnsupported?: number;
  newestMessageId?: string;
}

function shouldIngestText(message: Message): boolean {
  if (message.author.bot) return false;
  const text = message.content.trim();
  if (text.length < config.minMessageChars) return false;
  return true;
}

export async function ingestDiscordMessage(
  message: Message,
  mode: IngestMode,
  options: { filesOnly?: boolean } = {},
): Promise<SyncMessageResult> {
  const stats: SyncMessageResult = {
    ingested: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0,
    skippedNoContent: 0,
    skippedUnsupported: 0,
  };

  if (!message.guild) {
    stats.skipped += 1;
    return stats;
  }

  const guildId = message.guild.id;
  const channelId = message.channel.id;
  const chName =
    "name" in message.channel && message.channel.name
      ? channelLabel(message.channel.name)
      : `#${channelId}`;
  const jump = messageJumpUrl(guildId, channelId, message.id);
  const baseMeta = {
    guild_id: guildId,
    channel_id: channelId,
    message_id: message.id,
    ingest_mode: mode,
  };

  let didSomething = false;

  if (!options.filesOnly && shouldIngestText(message)) {
    try {
      const content = formatDiscordMessage(message, chName);
      const result = await ingestText({
        content,
        title: `Discord — ${chName} — ${message.id.slice(-8)}`,
        sourceId: `discord:msg:${guildId}:${channelId}:${message.id}`,
        author: message.member?.displayName ?? message.author.displayName,
        channel: chName,
        url: jump,
        metadata: baseMeta,
      });
      if (result.duplicate) stats.duplicates += 1;
      else stats.ingested += 1;
      didSomething = true;
    } catch (err) {
      console.error("[discord-sync] text ingest failed", message.id, err);
      stats.failed += 1;
    }
    await sleep(300);
  }

  const maxBytes = maxAttachmentBytes(config.maxAttachmentMb);
  const attachments = collectMessageAttachments(message);

  if (attachments.length === 0 && message.attachments.size > 0) {
    for (const raw of message.attachments.values()) {
      console.warn(
        "[discord-sync] unsupported attachment",
        raw.name ?? "(no name)",
        raw.contentType ?? "(no type)",
        `msg=${message.id}`,
      );
    }
  }

  for (const attachment of attachments) {
    if (attachment.size > maxBytes) {
      stats.skipped += 1;
      stats.skippedUnsupported = (stats.skippedUnsupported ?? 0) + 1;
      console.warn("[discord-sync] attachment too large", attachment.fileName);
      continue;
    }

    try {
      const buffer = await downloadDiscordAsset(attachment.url);
      const result = await ingestFile({
        buffer,
        fileName: attachment.fileName,
        sourceId: `discord:file:${guildId}:${channelId}:${message.id}:${attachment.id}`,
        author: message.member?.displayName ?? message.author.displayName,
        channel: chName,
        url: jump,
        metadata: {
          ...baseMeta,
          attachment_id: attachment.id,
          attachment_name: attachment.fileName,
          content_type: attachment.contentType,
        },
      });
      if (result.duplicate) stats.duplicates += 1;
      else stats.ingested += 1;
      didSomething = true;
    } catch (err) {
      console.error(
        "[discord-sync] file ingest failed",
        attachment.fileName,
        err,
      );
      stats.failed += 1;
    }
    await sleep(300);
  }

  if (!didSomething) {
    if (options.filesOnly || attachments.length === 0) {
      stats.skipped += 1;
      stats.skippedNoContent = 1;
    }
  }

  stats.newestMessageId = message.id;
  return stats;
}

export async function finalizeMessageCursor(
  channelId: string,
  messageId: string,
  mode: IngestMode,
): Promise<void> {
  await updateCursor(channelId, messageId, {
    poll: mode === "poll",
    live: mode === "live",
    backfill: mode === "backfill",
  });
}

export function mergeStats(target: SyncStats, partial: SyncMessageResult): void {
  target.ingested += partial.ingested;
  target.duplicates += partial.duplicates;
  target.skipped += partial.skipped;
  target.failed += partial.failed;
  target.skippedNoContent =
    (target.skippedNoContent ?? 0) + (partial.skippedNoContent ?? 0);
  target.skippedUnsupported =
    (target.skippedUnsupported ?? 0) + (partial.skippedUnsupported ?? 0);
}

export function formatSyncSummary(stats: SyncStats): string {
  const lines = [
    `Ingested: ${stats.ingested}`,
    `Duplicates: ${stats.duplicates}`,
    `Failed: ${stats.failed}`,
    `Skipped: ${stats.skipped}`,
  ];
  if (stats.messagesScanned != null) {
    lines.push(`Messages scanned: ${stats.messagesScanned}`);
  }
  if (stats.skippedBot) {
    lines.push(`  · bot messages: ${stats.skippedBot}`);
  }
  if (stats.skippedNoContent) {
    lines.push(`  · no ingestible text/files: ${stats.skippedNoContent}`);
  }
  if (stats.skippedUnsupported) {
    lines.push(`  · unsupported/too large: ${stats.skippedUnsupported}`);
  }
  if (stats.intentWarning) {
    lines.push("", stats.intentWarning);
  } else if (stats.ingested === 0 && stats.failed === 0) {
    lines.push(
      "",
      "Tip: Only `.md`, `.pdf`, `.docx`, `.txt` attachments are ingested. Ensure the API is running (`pnpm dev:api`).",
    );
  }
  return lines.join("\n");
}

export interface BackfillStats extends SyncStats {
  intentWarning?: string;
}

export function formatBackfillSummary(stats: BackfillStats): string {
  return formatSyncSummary(stats);
}
