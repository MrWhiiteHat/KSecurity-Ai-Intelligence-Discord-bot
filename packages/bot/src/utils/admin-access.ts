import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { config } from '../config';

export async function ensureAdminAccess(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const isServerAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
  const isAllowlistedUser = config.adminUserIds.includes(interaction.user.id);

  if (isServerAdmin || isAllowlistedUser) {
    return true;
  }

  await interaction.reply({
    content: 'You need administrator permissions. To allow this user, add the Discord user ID to BOT_ADMIN_USER_IDS in .env.',
    ephemeral: true,
  });

  return false;
}
