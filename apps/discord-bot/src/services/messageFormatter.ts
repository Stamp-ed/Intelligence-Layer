import type { Message } from "discord.js";

export function formatDiscordMessage(message: Message, channelLabel: string): string {
  const author = message.member?.displayName ?? message.author.displayName;
  const thread =
    message.channel.isThread() && "name" in message.channel
      ? ` / ${message.channel.name}`
      : "";
  const header = `[${message.createdAt.toISOString()}] ${author} (${channelLabel}${thread})`;
  return `${header}\n${message.content.trim()}`;
}

export function messageJumpUrl(guildId: string, channelId: string, messageId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export function channelLabel(name: string): string {
  return name.startsWith("#") ? name : `#${name}`;
}
