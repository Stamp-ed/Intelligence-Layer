import { preprocessText } from "../preprocessor.js";
import type { ParsedDocument } from "./textParser.js";

const MERGE_WINDOW_MS = 5 * 60 * 1000;

interface DiscordAuthor {
  name?: string;
  nickname?: string;
  id?: string;
}

interface DiscordMessage {
  id?: string;
  type?: string;
  timestamp?: string;
  timestampEdited?: string | null;
  author?: DiscordAuthor;
  content?: string;
  channel_id?: string;
  thread?: { name?: string; id?: string };
  reference?: { messageId?: string };
}

interface DiscordExport {
  guild?: { name?: string };
  channel?: { name?: string; id?: string };
  messages?: DiscordMessage[];
}

interface NormalizedMessage {
  timestamp: Date;
  author: string;
  content: string;
  channel: string;
  threadName?: string;
  messageId: string;
}

function authorName(author?: DiscordAuthor): string {
  return author?.nickname ?? author?.name ?? "Unknown";
}

function normalizeExport(data: DiscordExport): NormalizedMessage[] {
  const defaultChannel = data.channel?.name ?? "discord";
  const messages = (data.messages ?? []).filter(
    (m) => m.type !== "GuildMemberJoin" && (m.content?.trim() || m.type === "Default"),
  );

  return messages
    .map((m) => ({
      timestamp: new Date(m.timestamp ?? Date.now()),
      author: authorName(m.author),
      content: (m.content ?? "").trim(),
      channel: defaultChannel,
      threadName: m.thread?.name,
      messageId: m.id ?? crypto.randomUUID(),
    }))
    .filter((m) => m.content.length > 0)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function mergeConsecutive(messages: NormalizedMessage[]): string[] {
  const blocks: string[] = [];
  let current: NormalizedMessage[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0];
    const header = `[${first.timestamp.toISOString()}] ${first.author} (${first.channel}${first.threadName ? ` / ${first.threadName}` : ""})`;
    const body = current.map((m) => m.content).join("\n");
    blocks.push(`${header}\n${body}`);
    current = [];
  };

  for (const msg of messages) {
    if (current.length === 0) {
      current.push(msg);
      continue;
    }
    const prev = current[current.length - 1];
    const sameAuthor = prev.author === msg.author;
    const sameContext =
      prev.channel === msg.channel && prev.threadName === msg.threadName;
    const withinWindow =
      msg.timestamp.getTime() - prev.timestamp.getTime() <= MERGE_WINDOW_MS;

    if (sameAuthor && sameContext && withinWindow) {
      current.push(msg);
    } else {
      flush();
      current.push(msg);
    }
  }
  flush();
  return blocks;
}

export interface DiscordParseResult extends ParsedDocument {
  messageCount: number;
  channel: string;
  metadata: Record<string, unknown>;
}

export function parseDiscordExport(
  json: string | DiscordExport,
  options: { title?: string } = {},
): DiscordParseResult {
  const data = typeof json === "string" ? (JSON.parse(json) as DiscordExport) : json;
  const normalized = normalizeExport(data);
  const blocks = mergeConsecutive(normalized);
  const content = preprocessText(blocks.join("\n\n"));

  const channelName = data.channel?.name ?? "discord";
  const guildName = data.guild?.name;
  const title =
    options.title ??
    (guildName ? `${guildName} — #${channelName}` : `#${channelName} export`);

  return {
    title,
    content,
    sourceType: "discord",
    messageCount: normalized.length,
    channel: channelName,
    metadata: {
      guild: guildName,
      channel: data.channel,
      message_count: normalized.length,
      merged_blocks: blocks.length,
    },
  };
}
