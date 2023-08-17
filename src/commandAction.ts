import {
  ChannelType,
  Client,
  Events,
  GuildMember,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';
import { APPLICATION_ID, BOT_TOKEN, GUILD_ID, SOLUFA_CHANNEL_ID } from './envValues';
import { fetchAll } from './fetchMany';

const command = new SlashCommandBuilder()
  .setName('solufa')
  .setDescription('Solufaコースの統計データを表示');

const registerCommand = async () => {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  await rest
    .put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: [command.toJSON()] })
    .then(() => console.log('コマンド登録に成功'))
    .catch(e => console.log('コマンド登録に失敗', e.message));
};

export const commandAction = (client: Client<true>) => {
  registerCommand();

  const channel = client.channels.cache.get(SOLUFA_CHANNEL_ID);

  if (channel?.type !== ChannelType.GuildText) return;

  client.on(Events.InteractionCreate, async interaction => {
    if (
      !interaction.isChatInputCommand() ||
      interaction.commandName !== command.name ||
      interaction.channelId !== channel.id
    ) {
      return;
    }

    const messages = await fetchAll(channel);

    const data = messages
      .filter(m => /<@\d+?>.*?\d+件.*?\d+行/s.test(m.content))
      .map(m => m.content.match(/<@(\d+?)>.*?(\d+)件.*?(\d+)行/s)!)
      .reduce(
        (
          dict: Record<string, { pr: number; line: number; count: number }>,
          [_, userId, pr, line]
        ) => {
          const newDict = { ...dict, [userId]: dict[userId] ?? { pr: 0, line: 0, count: 0 } };
          newDict[userId].pr += +pr;
          newDict[userId].line += +line;
          newDict[userId].count += 1;

          return newDict;
        },
        {}
      );

    const users: GuildMember[] = await interaction
      .guild!.members.fetch({ user: Object.keys(data) })
      .then(res => Array.from(res.values()))
      .catch(e => {
        console.log('メンバー取得に失敗', e.message);
        return [];
      });

    const result = Object.entries(data)
      .map(([userId, val]) => ({
        name: users.find(u => u.id === userId)?.displayName ?? '',
        ...val
      }))
      .sort((a, b) => b.line - a.line);

    await interaction.reply({
      embeds: [
        {
          title: 'Solufaコースランキング',
          color: 0x1ecdcb,
          fields: result.map((r, i) => ({
            name: `${i + 1}位 ${r.name}`,
            value: `${r.count}日間 PR${r.pr}件 ${r.line}行\n1日平均 PR${(r.pr / r.count).toFixed(
              1
            )}件 ${(r.line / r.count).toFixed(1)}行`
          }))
        }
      ]
    });
  });
};
