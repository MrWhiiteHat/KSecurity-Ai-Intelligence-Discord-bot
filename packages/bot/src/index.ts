import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import http from 'http';
import { config } from './config';
import { setupCommands } from './commands/setup';
import { configCommands } from './commands/config';
import { helpCommands } from './commands/help';
import { statusCommands } from './commands/status';
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

function buildCommandPayload(client: Client): Array<any> {
  return Array.from(client.commands.values()).map((command) => command.data.toJSON());
}

async function putWithRetry(
  label: string,
  operation: () => Promise<void>,
  attempts = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await operation();
      if (attempt > 1) {
        console.log(`[bot] ${label} succeeded on retry ${attempt}/${attempts}.`);
      }
      return true;
    } catch (error) {
      console.error(`[bot] ${label} failed on attempt ${attempt}/${attempts}:`, error);

      if (attempt < attempts) {
        const waitMs = attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  return false;
}

async function registerCommandsForGuild(
  rest: REST,
  applicationId: string,
  guildId: string,
  guildName: string,
  commandPayload: Array<any>
): Promise<void> {
  const label = `Guild command registration for ${guildName} (${guildId})`;
  const registered = await putWithRetry(label, async () => {
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commandPayload });
  });

  if (registered) {
    console.log(`[bot] Registered ${commandPayload.length} guild command(s) for ${guildName} (${guildId}).`);
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

  const commandPayload = buildCommandPayload(client);
  if (commandPayload.length === 0) {
    console.warn('[bot] No slash commands available to register.');
    return;
  }

  const commandNames = Array.from(client.commands.keys()).sort();
  console.log(`[bot] Registering ${commandPayload.length} slash command(s): ${commandNames.join(', ')}`);

  const rest = new REST({ version: '10' }).setToken(config.token);

  const globalRegistered = await putWithRetry('Global command registration', async () => {
    await rest.put(Routes.applicationCommands(applicationId), { body: commandPayload });
  });

  if (globalRegistered) {
    console.log(`[bot] Registered ${commandPayload.length} global slash command(s).`);
  }

  for (const guild of client.guilds.cache.values()) {
    await registerCommandsForGuild(rest, applicationId, guild.id, guild.name, commandPayload);
  }
}

const client = new Client({
  intents,
});

client.commands = new Collection();

// Register commands
setupCommands(client);
configCommands(client);
helpCommands(client);
statusCommands(client);
console.log(`[bot] Loaded ${client.commands.size} command handler(s): ${Array.from(client.commands.keys()).sort().join(', ')}`);

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

client.on('guildCreate', async (guild) => {
  if (!config.token) {
    return;
  }

  const applicationId = client.application?.id || client.user?.id;
  if (!applicationId) {
    console.warn(`[bot] Joined ${guild.name} (${guild.id}) but could not resolve application ID for command sync.`);
    return;
  }

  const commandPayload = buildCommandPayload(client);
  if (commandPayload.length === 0) {
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.token);
  await registerCommandsForGuild(rest, applicationId, guild.id, guild.name, commandPayload);
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
