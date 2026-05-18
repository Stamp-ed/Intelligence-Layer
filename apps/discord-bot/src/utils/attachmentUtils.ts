import type { Attachment, Message } from "discord.js";
import { config } from "../config.js";
import { getAttachmentExtension, isIngestibleAttachment } from "./validation.js";

const CONTENT_TYPE_EXT: Record<string, string> = {
  "text/markdown": ".md",
  "text/plain": ".txt",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export interface ResolvedAttachment {
  id: string;
  url: string;
  fileName: string;
  size: number;
  contentType: string | null;
}

export function extensionFromContentType(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (CONTENT_TYPE_EXT[base]) return CONTENT_TYPE_EXT[base];
  if (base.includes("markdown")) return ".md";
  if (base.includes("pdf")) return ".pdf";
  return null;
}

export function resolveAttachmentFileName(attachment: Attachment): string | null {
  const name = attachment.name?.trim();
  if (name && isIngestibleAttachment(name)) {
    return name;
  }

  const ext = extensionFromContentType(attachment.contentType);
  if (!ext) {
    return null;
  }

  if (name) {
    const base = name.replace(/\.[^.]+$/, "");
    return `${base}${ext}`;
  }

  return `discord-${attachment.id}${ext}`;
}

export function collectMessageAttachments(message: Message): ResolvedAttachment[] {
  const seen = new Set<string>();
  const out: ResolvedAttachment[] = [];

  const add = (item: ResolvedAttachment) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };

  for (const attachment of message.attachments.values()) {
    const fileName = resolveAttachmentFileName(attachment);
    if (!fileName) continue;
    add({
      id: attachment.id,
      url: attachment.url,
      fileName,
      size: attachment.size,
      contentType: attachment.contentType,
    });
  }

  for (const embed of message.embeds) {
    if (!embed.url) continue;
    const fileName = embed.title ?? "";
    const url = embed.url;
    if (fileName && isIngestibleAttachment(fileName)) {
      add({
        id: `embed:${embed.url}`,
        url,
        fileName,
        size: 0,
        contentType: null,
      });
      continue;
    }
    const ext = getAttachmentExtension(url);
    if (isIngestibleAttachment(`file${ext}`)) {
      const baseName = url.split("/").pop()?.split("?")[0] ?? `embed-${message.id}`;
      add({
        id: `embed:${url}`,
        url,
        fileName: baseName.includes(".") ? baseName : `${baseName}${ext}`,
        size: 0,
        contentType: null,
      });
    }
  }

  return out;
}

export async function downloadDiscordAsset(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${config.discordBotToken}` },
  });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
