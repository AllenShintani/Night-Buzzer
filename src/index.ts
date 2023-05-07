import { Client, Events, GatewayIntentBits, MessageType } from 'discord.js';
import { config } from 'dotenv';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';

config();

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
const OPENAI_KEY = process.env.OPENAI_KEY ?? '';
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));
const chatWithOpenai = (messages: ChatCompletionRequestMessage[]) =>
  openai
    .createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'あなたは日本の大学のコンピュータサイエンス学部の教授です。' },
        ...messages
      ],
      frequency_penalty: 2,
      temperature: 1
    })
    .then(
      completion =>
        completion.data.choices[0].message?.content ?? 'ちょっと何言ってるかわからないですね'
    )
    .catch(err => (err.response ? `${err.response.status}: ${err.response.data}` : err.message));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const trimContent = (content: string) => content.replace(/<@\d+>/g, '').trim();

client.once(Events.ClientReady, c => {
  console.log(`${c.user.username} ready.`);

  client.on(Events.MessageCreate, async message => {
    if (message.author.bot || message.type !== MessageType.Default) return;

    if (message.channel.isThread()) {
      if (message.channel.ownerId !== c.user.id) return;

      message.channel.sendTyping();

      const [starter, messages] = await Promise.all([
        message.channel.fetchStarterMessage(),
        message.channel.messages
          .fetch({ limit: 100 })
          .then(messages => messages.filter(m => m.type === MessageType.Default).reverse())
      ]);

      if (!starter) return;

      await chatWithOpenai([
        { role: 'user', content: trimContent(starter.content) },
        ...messages.map(
          (m): ChatCompletionRequestMessage => ({
            role: m.author.id === c.user.id ? 'assistant' : 'user',
            content: trimContent(m.content)
          })
        )
      ]).then(m => message.reply(m));
    } else if (message.mentions.users.has(c.user.id)) {
      const thread = await message.startThread({
        name: `${message.author.username} with フルーリオちゃん`
      });
      thread.sendTyping();

      await chatWithOpenai([{ role: 'user', content: trimContent(message.content) }]).then(m =>
        thread.send(m)
      );
    }
  });
});

client.login(BOT_TOKEN);
