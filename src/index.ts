import { Client, Events, GatewayIntentBits } from 'discord.js';
import { BOT_TOKEN } from './envValues';
import { nightBuzzer } from './nightBuzzer';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, c => {
  console.log(`${c.user.username} ready.`);
  nightBuzzer(c);
});

client.login(BOT_TOKEN);
