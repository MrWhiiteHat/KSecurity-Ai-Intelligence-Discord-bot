import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { apiClient } from '../services/api';
import { SlashCommand } from './types';

function backendHealthUrl(): string {
  return `${config.backendUrl.replace(/\/$/, '')}/health`;
}

export const statusCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check bot setup and backend health for this server'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    let backendStatus = 'unreachable';
    let backendLatency = 'n/a';

    const startedAt = Date.now();
    try {
      const response = await fetch(backendHealthUrl(), { method: 'GET' });
      backendLatency = `${Date.now() - startedAt}ms`;
      backendStatus = response.ok ? 'healthy' : `http ${response.status}`;
    } catch {
      backendLatency = `${Date.now() - startedAt}ms`;
    }

    let setupStatus = 'not initialized';
    try {
      await apiClient.get(`/config/${guild.id}`);
      setupStatus = 'initialized';
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setupStatus = 'not initialized';
      } else {
        setupStatus = 'unknown (config check failed)';
      }
    }

    const content = [
      `Server: ${guild.name}`,
      `Setup: ${setupStatus}`,
      `Backend: ${backendStatus}`,
      `Backend latency: ${backendLatency}`,
      `Loaded slash commands: ${(interaction.client as any).commands?.size ?? 0}`,
    ].join('\n');

    await interaction.editReply(content);
  },
};

export function statusCommands(client: any) {
  client.commands.set(statusCommand.data.name, statusCommand);
}
