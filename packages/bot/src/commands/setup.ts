import { Client, ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from './types';
import { apiClient } from '../services/api';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Initialize threat detection for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply('This command can only be used in a server.');
        return;
      }

      // Register server in backend
      await apiClient.post('/config', {
        serverId: guild.id,
        aiWeight: 0.5,
        urlWeight: 0.3,
        behaviorWeight: 0.2,
        deleteThreshold: 80,
        warnThreshold: 50,
        moderationRoleId: null,
      });

      await interaction.editReply(
        `**Threat detection initialized for ${guild.name}!**\n\n` +
        `I will now monitor messages for scams, phishing, and suspicious behavior.\n\n` +
        `Use \`/config\` to customize detection settings.`
      );
    } catch (error) {
      console.error('Setup error:', error);
      await interaction.editReply('Failed to initialize threat detection. Please try again.');
      return;
    }
  },
};

export function setupCommands(client: Client) {
  client.commands.set(command.data.name, command);
}
