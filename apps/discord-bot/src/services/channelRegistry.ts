import { prisma } from "../lib/prisma.js";

export async function enableChannel(params: {
  guildId: string;
  channelId: string;
  channelName: string;
  enabledBy: string;
}): Promise<void> {
  await prisma.discordChannelSubscription.upsert({
    where: { channelId: params.channelId },
    create: {
      guildId: params.guildId,
      channelId: params.channelId,
      channelName: params.channelName,
      enabled: true,
      enabledBy: params.enabledBy,
    },
    update: {
      channelName: params.channelName,
      enabled: true,
      enabledBy: params.enabledBy,
    },
  });
}

export async function disableChannel(channelId: string): Promise<boolean> {
  const existing = await prisma.discordChannelSubscription.findUnique({
    where: { channelId },
  });
  if (!existing) {
    return false;
  }
  await prisma.discordChannelSubscription.update({
    where: { channelId },
    data: { enabled: false },
  });
  return true;
}

export async function isChannelEnabled(channelId: string): Promise<boolean> {
  const sub = await prisma.discordChannelSubscription.findUnique({
    where: { channelId },
  });
  return sub?.enabled === true;
}

export async function getEnabledChannels(): Promise<
  { channelId: string; guildId: string; channelName: string | null }[]
> {
  return prisma.discordChannelSubscription.findMany({
    where: { enabled: true },
    select: { channelId: true, guildId: true, channelName: true },
  });
}

export async function getCursor(channelId: string): Promise<string | null> {
  const cursor = await prisma.discordIngestCursor.findUnique({
    where: { channelId },
  });
  return cursor?.lastMessageId ?? null;
}

export async function updateCursor(
  channelId: string,
  lastMessageId: string,
  fields: { poll?: boolean; backfill?: boolean; live?: boolean },
): Promise<void> {
  await prisma.discordIngestCursor.upsert({
    where: { channelId },
    create: {
      channelId,
      lastMessageId,
      lastPollAt: fields.poll ? new Date() : undefined,
      lastBackfillAt: fields.backfill ? new Date() : undefined,
      lastLiveIngestAt: fields.live ? new Date() : undefined,
    },
    update: {
      lastMessageId,
      ...(fields.poll ? { lastPollAt: new Date() } : {}),
      ...(fields.backfill ? { lastBackfillAt: new Date() } : {}),
      ...(fields.live ? { lastLiveIngestAt: new Date() } : {}),
    },
  });
}
