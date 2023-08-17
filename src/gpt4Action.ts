import { Client, Events, MessageType } from 'discord.js';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { setTimeout } from 'timers/promises';
import { OPENAI_KEY } from './envValues';

const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

let chatCounter = 0;
const chatWithOpenai = (messages: ChatCompletionRequestMessage[]): Promise<string[]> => {
  chatCounter += 1;
  console.log(`${chatCounter}件考え中... ${new Date().toLocaleString()}`);

  return openai
    .createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'あなたは日本の大学のコンピュータサイエンス学部の教授です。' },
        ...messages
      ],
      frequency_penalty: 1,
      temperature: 1
    })
    .then(completion => {
      const { message } = completion.data.choices[0];

      if (!message) return ['ちょっと何言ってるかわからないですね'];

      const list: string[] = [];
      const textLength = 1900;

      while (list.length * textLength < message.content.length) {
        list.push(message.content.slice(list.length * textLength, (list.length + 1) * textLength));
      }

      return [
        ...(list.length > 1 ? list.slice(0, -1) : []),
        `${list.slice(-1)[0]}\n(${message.content.length}文字)`
      ];
    })
    .catch(err => [
      err.response ? `${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message
    ])
    .finally(() => {
      chatCounter -= 1;
      console.log(`${chatCounter}件考え中... ${new Date().toLocaleString()}`);
    });
};

const trimContent = (content: string) => content.replace(/<@\d+>/g, '').trim();

export const gpt4Action = (client: Client<true>) => {
  client.on(Events.MessageCreate, async message => {
    if (message.author.bot || message.type !== MessageType.Default) return;

    if (message.channel.isThread()) {
      if (message.channel.ownerId !== client.user.id) return;

      const [starter, messages] = await Promise.all([
        message.channel.fetchStarterMessage(),
        message.channel.messages
          .fetch({ limit: 100 })
          .then(messages => messages.filter(m => m.type === MessageType.Default).reverse())
      ]);

      if (!starter) return;

      let isTyping = true;
      (async () => {
        // eslint-disable-next-line no-unmodified-loop-condition
        while (isTyping) {
          await message.channel.sendTyping();
          await setTimeout(2000);
        }
      })();

      await chatWithOpenai([
        { role: 'user', content: trimContent(starter.content) },
        ...messages.map(
          (m): ChatCompletionRequestMessage =>
            m.author.id === client.user.id
              ? {
                  role: 'assistant',
                  content: trimContent(m.content.replace(/\n\(\d+文字\)$/, ''))
                }
              : { role: 'user', content: trimContent(m.content) }
        )
      ]).then(async list => {
        isTyping = false;

        for (const m of list) {
          await message.reply(m);
        }
      });
    } else if (message.mentions.users.has(client.user.id)) {
      const thread = await message.startThread({
        name: `${message.author.username} with フルーリオちゃん`
      });

      let isTyping = true;
      (async () => {
        // eslint-disable-next-line no-unmodified-loop-condition
        while (isTyping) {
          await thread.sendTyping();
          await setTimeout(2000);
        }
      })();

      await chatWithOpenai([{ role: 'user', content: trimContent(message.content) }]).then(
        async list => {
          isTyping = false;

          for (const m of list) {
            await thread.send(m);
          }
        }
      );
    }
  });
};
