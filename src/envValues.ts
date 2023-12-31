import { config } from 'dotenv';

config();

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
const OPENAI_KEY = process.env.OPENAI_KEY ?? '';
const APPLICATION_ID = process.env.APPLICATION_ID ?? '';
const GUILD_ID = process.env.GUILD_ID ?? '';
const NIGHT_CHANNEL_ID = process.env.NIGHT_CHANNEL_ID ?? '';

export { BOT_TOKEN, OPENAI_KEY, APPLICATION_ID, GUILD_ID, NIGHT_CHANNEL_ID };
