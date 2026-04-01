import { REST, Routes } from 'discord.js';
import { config } from '../config';

const commands = [
  {
    name: 'setup',
    description: 'Initialize threat detection for this server',
  },
  {
    name: 'config',
    description: 'Configure threat detection settings',
    options: [
      {
        name: 'setting',
        description: 'The setting to change',
        type: 3,
        required: true,
        choices: [
          { name: 'Delete Threshold', value: 'deleteThreshold' },
          { name: 'Warn Threshold', value: 'warnThreshold' },
          { name: 'AI Weight', value: 'aiWeight' },
          { name: 'URL Weight', value: 'urlWeight' },
          { name: 'Behavior Weight', value: 'behaviorWeight' },
          { name: 'Moderation Role', value: 'moderationRole' },
        ],
      },
      {
        name: 'value',
        description: 'The new value',
        type: 3,
        required: true,
      },
    ],
  },
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
