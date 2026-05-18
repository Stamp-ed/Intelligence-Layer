import type { Interaction } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { config } from "../config.js";

export function canRunIngestCommands(interaction: Interaction): boolean {
  if (!interaction.inGuild()) {
    return false;
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return true;
  }

  if (config.discordCommandRoleIds.length === 0) {
    return true;
  }

  const member = interaction.member;
  if (!member || !("roles" in member)) {
    return false;
  }

  const roles = member.roles;
  if (!roles || typeof roles === "string" || !("cache" in roles)) {
    return false;
  }

  return config.discordCommandRoleIds.some((roleId) => roles.cache.has(roleId));
}
