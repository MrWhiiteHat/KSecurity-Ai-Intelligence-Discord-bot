import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './config';
import { setupCommands } from './commands/setup';
import { configCommands } from './commands/config';
import { handleMessage } from './events/message';
import { handleReady } from './events/ready';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// Register commands
setupCommands(client);
configCommands(client);

// Event handlers
client.on('ready', () => handleReady(client));
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

client.login(config.token);
