import { Collection, Client } from 'discord.js';
import { SlashCommand } from './commands/types';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, SlashCommand>;
  }
}
