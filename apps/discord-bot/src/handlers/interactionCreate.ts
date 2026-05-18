import type { ChatInputCommandInteraction, Client, TextBasedChannel } from "discord.js";
import { enableChannel, disableChannel } from "../services/channelRegistry.js";
import { runChannelBackfill } from "../services/backfillService.js";
import { formatBackfillSummary } from "../services/channelSyncService.js";
import { canRunIngestCommands } from "../utils/permissions.js";

async function safeReply(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  } catch (err) {
    console.error("[discord-bot] failed to send interaction response", err);
  }
}

async function requireTextChannel(
  interaction: ChatInputCommandInteraction,
): Promise<{ id: string; name: string; channel: TextBasedChannel } | null> {
  const ch = interaction.channel;
  if (!ch?.isTextBased() || ch.isDMBased()) {
    await safeReply(
      interaction,
      "This command must be run in a server text channel or thread.",
    );
    return null;
  }

  let channel: TextBasedChannel = ch;
  try {
    channel = (await ch.fetch()) as TextBasedChannel;
  } catch {
    // use cached channel if fetch fails
  }

  const name = "name" in channel && channel.name ? channel.name : channel.id;
  return { id: channel.id, name, channel };
}

const BACKFILL_COMMANDS = new Set([
  "ingest-backfill-all",
  "ingest-backfill-files",
  "ingest-backfill-since",
]);

export function registerInteractionHandler(client: Client): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild() || !interaction.guildId) return;

    const { commandName } = interaction;
    console.log(`[discord-bot] command /${commandName} from ${interaction.user.tag}`);

    try {
      if (!canRunIngestCommands(interaction)) {
        await safeReply(
          interaction,
          "You do not have permission to run ingest commands.",
        );
        return;
      }

      const channelInfo = await requireTextChannel(interaction);
      if (!channelInfo) return;

      if (BACKFILL_COMMANDS.has(commandName)) {
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply("Backfill started — this may take several minutes…");
      }

      if (commandName === "ingest-on") {
        await enableChannel({
          guildId: interaction.guildId,
          channelId: channelInfo.id,
          channelName: channelInfo.name,
          enabledBy: interaction.user.id,
        });
        await safeReply(
          interaction,
          `Ingest enabled for #${channelInfo.name}. New content syncs on the next poll (every ${process.env.DISCORD_POLL_INTERVAL_HOURS ?? "6"}h). Run \`/ingest-backfill-all\` for history.`,
        );
        return;
      }

      if (commandName === "ingest-off") {
        const disabled = await disableChannel(channelInfo.id);
        await safeReply(
          interaction,
          disabled
            ? `Ingest disabled for #${channelInfo.name}.`
            : "Channel was not subscribed.",
        );
        return;
      }

      const textChannel = channelInfo.channel;

      if (commandName === "ingest-backfill-all") {
        const limit = interaction.options.getInteger("limit") ?? 500;
        const stats = await runChannelBackfill(textChannel, {
          mode: "all",
          limit,
          onProgress: (n) => {
            if (n % 10 === 0) {
              void interaction.editReply(`Backfill in progress… ${n} messages processed`);
            }
          },
        });
        await safeReply(interaction, `Backfill complete.\n${formatBackfillSummary(stats)}`);
        return;
      }

      if (commandName === "ingest-backfill-files") {
        const limit = interaction.options.getInteger("limit") ?? 500;
        const stats = await runChannelBackfill(textChannel, {
          mode: "files",
          limit,
          onProgress: (n) => {
            if (n % 10 === 0) {
              void interaction.editReply(`File backfill… ${n} messages scanned`);
            }
          },
        });
        await safeReply(
          interaction,
          `File backfill complete.\n${formatBackfillSummary(stats)}`,
        );
        return;
      }

      if (commandName === "ingest-backfill-since") {
        const days = interaction.options.getInteger("days");
        const afterStr = interaction.options.getString("after");
        if ((days && afterStr) || (!days && !afterStr)) {
          await safeReply(
            interaction,
            "Provide exactly one of: `days` or `after` (ISO date YYYY-MM-DD).",
          );
          return;
        }

        let since: Date;
        if (days) {
          since = new Date();
          since.setDate(since.getDate() - days);
        } else {
          since = new Date(afterStr!);
          if (Number.isNaN(since.getTime())) {
            await safeReply(interaction, "Invalid `after` date.");
            return;
          }
        }

        if (!interaction.deferred) {
          await interaction.deferReply({ ephemeral: true });
        }

        const limit = interaction.options.getInteger("limit") ?? 500;
        const stats = await runChannelBackfill(textChannel, {
          mode: "since",
          limit,
          since,
        });
        await safeReply(
          interaction,
          `Backfill since ${since.toISOString().slice(0, 10)} complete.\n${formatBackfillSummary(stats)}`,
        );
      }
    } catch (err) {
      console.error("[discord-bot] command error", commandName, err);
      const msg = err instanceof Error ? err.message : String(err);
      await safeReply(interaction, `Error: ${msg}`);
    }
  });
}
