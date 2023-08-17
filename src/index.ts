import { Client, Events, GatewayIntentBits } from 'discord.js';
import { commandAction } from './commandAction';
import { BOT_TOKEN } from './envValues';
import { gpt4Action } from './gpt4Action';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, c => {
  console.log(`${c.user.username} ready.`);

  gpt4Action(c);
  commandAction(c);
});

client.login(BOT_TOKEN);
