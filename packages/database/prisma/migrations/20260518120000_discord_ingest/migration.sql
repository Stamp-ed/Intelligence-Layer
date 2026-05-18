-- CreateTable
CREATE TABLE "discord_channel_subscriptions" (
    "id" UUID NOT NULL,
    "guild_id" VARCHAR(32) NOT NULL,
    "channel_id" VARCHAR(32) NOT NULL,
    "channel_name" VARCHAR(255),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabled_by" VARCHAR(32),
    "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_channel_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discord_ingest_cursors" (
    "channel_id" VARCHAR(32) NOT NULL,
    "last_message_id" VARCHAR(32),
    "last_poll_at" TIMESTAMP(3),
    "last_backfill_at" TIMESTAMP(3),
    "last_live_ingest_at" TIMESTAMP(3),

    CONSTRAINT "discord_ingest_cursors_pkey" PRIMARY KEY ("channel_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discord_channel_subscriptions_channel_id_key" ON "discord_channel_subscriptions"("channel_id");

-- CreateIndex
CREATE INDEX "discord_channel_subscriptions_guild_id_idx" ON "discord_channel_subscriptions"("guild_id");
