import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
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
  backendUrl: config.backendUrl,
});

async function checkBackendHealth(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${config.backendUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[bot] Backend health probe failed with status ${response.status} at ${config.backendUrl}`);
      return;
    }

    console.log(`[bot] Backend health probe succeeded at ${config.backendUrl}`);
  } catch (error) {
    console.error(`[bot] Backend health probe failed at ${config.backendUrl}:`, error);
  } finally {
    clearTimeout(timeout);
  }
}

async function registerSlashCommands(client: Client): Promise<void> {
  if (!config.token) {
    return;
  }

  const applicationId = client.application?.id || client.user?.id;
  if (!applicationId) {
    console.warn('[bot] Could not resolve Discord application ID for command registration.');
    return;
  }

  const commandPayload = Array.from(client.commands.values()).map((command) => command.data.toJSON());
  if (commandPayload.length === 0) {
    console.warn('[bot] No slash commands available to register.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    await rest.put(Routes.applicationCommands(applicationId), { body: commandPayload });
    console.log(`[bot] Registered ${commandPayload.length} global slash command(s).`);
  } catch (error) {
    console.error('[bot] Failed to register global slash commands:', error);
  }

  for (const guild of client.guilds.cache.values()) {
    try {
      await rest.put(Routes.applicationGuildCommands(applicationId, guild.id), { body: commandPayload });
      console.log(`[bot] Registered ${commandPayload.length} guild command(s) for ${guild.name} (${guild.id}).`);
    } catch (error) {
      console.error(`[bot] Failed to register guild commands for ${guild.name} (${guild.id}):`, error);
    }
  }
}

const client = new Client({
  intents,
});

client.commands = new Collection();

// Register commands
setupCommands(client);
configCommands(client);

void checkBackendHealth();

// Event handlers
client.on('clientReady', async () => {
  botReady = true;
  handleReady(client);

  try {
    await registerSlashCommands(client);
  } catch (error) {
    console.error('[bot] Command registration failed during startup:', error);
  }
});
client.on('messageCreate', (message) => handleMessage(message, client));
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[bot] Unknown command received: ${interaction.commandName}`);
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: 'This command is not available yet. Please try again in a few seconds.',
        ephemeral: true,
      });
    }
    return;
  }

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
  console.error('[bot] No Discord token found after explicit and inferred env checks; bot will stay in health-only mode.');
} else {
  client.login(config.token).catch((error) => {
    console.error('[bot] Failed to login to Discord. Check token and privileged intents:', error);
  });
}
