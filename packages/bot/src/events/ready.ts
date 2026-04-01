import { Client } from 'discord.js';

export function handleReady(client: Client) {
  console.log(`Threat Detector bot logged in as ${client.user?.tag}`);
  console.log(`Monitoring ${client.guilds.cache.size} servers`);

  client.user?.setActivity('protecting servers', { type: 2 });
}
