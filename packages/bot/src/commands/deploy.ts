import { REST, Routes } from 'discord.js';
import { config } from '../config';
import { configCommand } from './config';
import { helpCommand } from './help';
import { setupCommand } from './setup';
import { statusCommand } from './status';

const commands = [
  setupCommand.data.toJSON(),
  configCommand.data.toJSON(),
  helpCommand.data.toJSON(),
  statusCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
})();
