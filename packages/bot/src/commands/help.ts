import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from './types';

export const helpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available bot commands and usage hints'),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandMap = (interaction.client as any).commands as Map<string, { data: { name: string; description: string } }>;
    const commands = Array.from(commandMap.values())
      .map((cmd) => ({ name: cmd.data.name, description: cmd.data.description || 'No description' }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const lines = commands.map((cmd) => `/${cmd.name} - ${cmd.description}`);

    const content = [
      `Available commands (${commands.length}):`,
      ...lines,
      '',
      'Tips:',
      '- Use /setup once per server before moderation starts.',
      '- Use /config to tune thresholds and weights.',
      '- Use /status to verify bot and backend connectivity.',
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
