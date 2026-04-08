import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from './types';

export const helpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available bot commands and usage hints'),

  async execute(interaction: ChatInputCommandInteraction) {
    const content = [
      'Available commands (4):',
      '/setup - Initialize threat detection for this server',
      '/config - Update server detection settings',
      '/help - Show this command list',
      '/status - Check bot and backend status',
    ].join('\n');

    await interaction.reply({
      content,
      ephemeral: true,
    });
  },
};

export function helpCommands(client: any) {
  client.commands.set(helpCommand.data.name, helpCommand);
}
