import { createServer } from "http";
import { Events } from "discord.js";
import { createDiscordClient } from "./client.js";
import { config } from "./config.js";
import { registerInteractionHandler } from "./handlers/interactionCreate.js";
import { registerMessageHandler } from "./handlers/messageCreate.js";
import { startPollScheduler } from "./jobs/pollEnabledChannels.js";
import { prisma } from "./lib/prisma.js";

async function main(): Promise<void> {
  const client = createDiscordClient();

  registerInteractionHandler(client);
  registerMessageHandler(client);

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`[discord-bot] Logged in as ${readyClient.user.tag}`);
    console.log(
      "[discord-bot] Requires Message Content Intent in Discord Developer Portal (Bot → Privileged Gateway Intents)",
    );
    startPollScheduler(client);
  });

  const httpEnabled =
    (process.env.DISCORD_BOT_HTTP_ENABLED ?? "true").toLowerCase() !== "false";

  if (httpEnabled) {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", user: client.user?.tag ?? null }));
    });
    server.listen(config.port, () => {
      console.log(`[discord-bot] Health on :${config.port}`);
    });
  } else {
    console.log("[discord-bot] HTTP health disabled (API owns public PORT)");
  }

  await client.login(config.discordBotToken);
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
