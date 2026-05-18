import { REST, Routes } from "discord.js";
import { commandDefinitions } from "./commands/definitions.js";
import { config } from "./config.js";

const rest = new REST({ version: "10" }).setToken(config.discordBotToken);

async function main(): Promise<void> {
  if (config.discordGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId),
      { body: commandDefinitions },
    );
    console.log(`Registered ${commandDefinitions.length} guild commands`);
  } else {
    await rest.put(Routes.applicationCommands(config.discordClientId), {
      body: commandDefinitions,
    });
    console.log(`Registered ${commandDefinitions.length} global commands`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
