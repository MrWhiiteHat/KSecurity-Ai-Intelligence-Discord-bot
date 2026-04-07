import { Client, GatewayIntentBits, Collection } from 'discord.js';
import http from 'http';
import { config } from './config';
import { setupCommands } from './commands/setup';
import { configCommands } from './commands/config';
import { handleMessage } from './events/message';
import { handleReady } from './events/ready';

let botReady = false;

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
];

if (config.enableMessageContentIntent) {
  intents.push(GatewayIntentBits.MessageContent);
}

if (config.enableGuildMembersIntent) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const healthServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: botReady ? 'ok' : 'starting',
      ready: botReady,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

healthServer.listen(config.healthPort, '0.0.0.0', () => {
  console.log(`Bot health server running on 0.0.0.0:${config.healthPort}`);
});

console.log('[bot] Intent configuration:', {
  enableMessageContentIntent: config.enableMessageContentIntent,
  enableGuildMembersIntent: config.enableGuildMembersIntent,
  hasToken: Boolean(config.token),
  hasApiKey: Boolean(config.apiKey),
});

const client = new Client({
  intents,
});

client.commands = new Collection();

// Register commands
setupCommands(client);
configCommands(client);

// Event handlers
client.on('ready', () => {
  botReady = true;
  handleReady(client);
});
client.on('messageCreate', (message) => handleMessage(message, client));
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('There was an error executing this command!');
    } else {
      await interaction.reply({
        content: 'There was an error executing this command!',
        ephemeral: true,
      });
    }
  }
});

client.on('error', (error) => {
  console.error('[bot] Discord client error:', error);
});

client.on('shardError', (error) => {
  console.error('[bot] Discord shard error:', error);
});

client.on('warn', (message) => {
  console.warn('[bot] Discord warning:', message);
});

if (!config.token) {
  console.error('[bot] No Discord token found (checked DISCORD_BOT_TOKEN, DISCORD_TOKEN, BOT_TOKEN, TOKEN); bot will stay in health-only mode.');
} else {
  client.login(config.token).catch((error) => {
    console.error('[bot] Failed to login to Discord. Check token and privileged intents:', error);
  });
}
