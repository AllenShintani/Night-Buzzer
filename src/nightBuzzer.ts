import { ChannelType, Client, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { attachBuzzer, board, SerialPort } from 'edison';
import { APPLICATION_ID, BOT_TOKEN, GUILD_ID, NIGHT_CHANNEL_ID } from './envValues';

const command = new SlashCommandBuilder()
  .setName('night')
  .setDescription('夜間の開錠をお願いする。');

const registerCommand = async () => {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  await rest
    .put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: [command.toJSON()] })
    .then(() => console.log('success to register command'))
    .catch(e => console.log('failed to register command', e.message));
};

const waitForBoardReady = (): Promise<SerialPort> => {
  return new Promise(resolve => {
    board.on('ready', (port: SerialPort) => {
      resolve(port);
    });
  });
};

export const nightBuzzer = async (client: Client<true>) => {
  registerCommand();

  const channel = client.channels.cache.get(NIGHT_CHANNEL_ID);

  if (channel?.type !== ChannelType.GuildText) return;

  // wait yet setting board
  const port = await waitForBoardReady();
  const buzzer = attachBuzzer(port, 12);

  client.on(Events.InteractionCreate, async interaction => {
    if (
      !interaction.isChatInputCommand() ||
      interaction.commandName !== command.name ||
      interaction.channelId !== channel.id
    ) {
      return;
    }

    const userId = interaction.user.id;
    const guildMember = interaction.guild?.members.cache.get(userId);
    const displayName = guildMember?.nickname || interaction.user.username;

    buzzer.on();

    setTimeout(() => {
      buzzer.off();
    }, 3000);

    await interaction.reply({
      embeds: [
        {
          title: `${displayName}が夜間の開錠申請を行いました。`
        }
      ]
    });
  });
};
