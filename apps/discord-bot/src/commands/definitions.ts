import {
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

export const commandDefinitions: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  new SlashCommandBuilder()
    .setName("ingest-on")
    .setDescription("Enable scheduled ingest for this channel (and live if configured)")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("ingest-off")
    .setDescription("Disable ingest for this channel")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("ingest-backfill-all")
    .setDescription("Backfill all messages and files in this channel")
    .addIntegerOption((opt) =>
      opt
        .setName("limit")
        .setDescription("Max messages to scan (default 500)")
        .setMinValue(1)
        .setMaxValue(10000),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("ingest-backfill-files")
    .setDescription("Backfill file attachments only in this channel")
    .addIntegerOption((opt) =>
      opt
        .setName("limit")
        .setDescription("Max messages to scan (default 500)")
        .setMinValue(1)
        .setMaxValue(10000),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("ingest-backfill-since")
    .setDescription("Backfill messages and files on or after a date")
    .addIntegerOption((opt) =>
      opt
        .setName("days")
        .setDescription("Only content from the last N days")
        .setMinValue(1)
        .setMaxValue(3650),
    )
    .addStringOption((opt) =>
      opt
        .setName("after")
        .setDescription("ISO date — ingest content on or after this date (YYYY-MM-DD)"),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("limit")
        .setDescription("Max messages to scan (default 500)")
        .setMinValue(1)
        .setMaxValue(10000),
    )
    .toJSON(),
];
