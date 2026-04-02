import { Message, Client } from 'discord.js';
import { analyzeMessage } from '../services/api';

export async function handleMessage(message: Message, client: Client) {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  try {
    // Calculate account age
    const accountAgeMs = Date.now() - message.author.createdTimestamp;
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

    // Send to backend for analysis
    const result = await analyzeMessage({
      serverId: message.guild.id,
      userId: message.author.id,
      username: message.author.username,
      content: message.content,
      accountAgeDays: Math.floor(accountAgeDays),
    });

    // Execute decision
    switch (result.decision) {
      case 'delete':
        await handleDeleteAction(message, result);
        break;
      case 'warn':
        await handleWarnAction(message, result);
        break;
      case 'allow':
        // Log only, no action needed
        break;
    }
  } catch (error: any) {
    // Log error but don't disrupt the conversation
    if (error.response?.status === 401) {
      console.error('Bot API key rejected by backend');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Backend service unavailable');
    } else {
      console.error('Message analysis failed:', error.message);
    }
  }
}

async function handleDeleteAction(message: Message, result: any) {
  try {
    const channel = message.channel;
    await message.delete();

    // Send alert to channel (MVP: simple message)
    if (!channel.isTextBased() || !('send' in channel)) return;

    await channel.send({
      content: `**Threat Detected**\n` +
        `Message from ${message.author} was deleted.\n` +
        `Risk Score: **${result.riskScore}/100**\n` +
        `Reasons:\n${result.reasons.map((r: string) => `- ${r}`).join('\n')}`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
}

async function handleWarnAction(message: Message, result: any) {
  try {
    const channel = message.channel;
    // Send warning in channel
    if (!channel.isTextBased() || !('send' in channel)) return;

    await channel.send({
      content: `${message.author}, your message was flagged as potentially suspicious.\n` +
        `Risk Score: **${result.riskScore}/100**\n` +
        `Please be cautious with links and requests.`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.error('Failed to send warning:', error);
  }
}
