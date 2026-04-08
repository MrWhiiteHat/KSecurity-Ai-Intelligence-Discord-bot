import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from './types';
import { apiClient } from '../services/api';

export const configCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure threat detection settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('setting')
        .setDescription('The setting to change')
        .setRequired(true)
        .addChoices(
          { name: 'Delete Threshold (default: 80)', value: 'deleteThreshold' },
          { name: 'Warn Threshold (default: 50)', value: 'warnThreshold' },
          { name: 'AI Weight (default: 0.5)', value: 'aiWeight' },
          { name: 'URL Weight (default: 0.3)', value: 'urlWeight' },
          { name: 'Behavior Weight (default: 0.2)', value: 'behaviorWeight' },
          { name: 'Moderation Role', value: 'moderationRole' }
        )
    )
    .addStringOption(option =>
      option.setName('value')
        .setDescription('The new value')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    try {
      let parsedValue: string | number | null = value;

      if (setting === 'moderationRole') {
        // Extract role ID from mention
        const roleId = value.match(/\d+/)?.[0] || value;
        parsedValue = roleId;
      } else {
        parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) {
          await interaction.editReply('Invalid value. Please provide a number.');
          return;
        }
      }

      const body: any = { serverId: guildId };
      body[setting] = parsedValue;

      await apiClient.post('/config', body);

      await interaction.editReply(
        `**Setting updated!**\n\`${setting}\` -> \`${parsedValue}\``
      );
    } catch (error) {
      console.error('Config error:', error);
      await interaction.editReply('Failed to update configuration.');
      return;
    }
  },
};

export function configCommands(client: any) {
  client.commands.set(configCommand.data.name, configCommand);
}
