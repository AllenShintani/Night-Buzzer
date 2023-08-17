// https://scrapbox.io/discordjs-japan/100%E4%BB%B6%E4%BB%A5%E4%B8%8A%E3%81%AE%E3%83%A1%E3%83%83%E3%82%BB%E3%83%BC%E3%82%B8%E3%82%92%E5%8F%96%E5%BE%97%E3%81%99%E3%82%8B%E6%96%B9%E6%B3%95
import { Collection, FetchMessagesOptions, Message, TextChannel } from 'discord.js';

const array2Collection = (messages: Message<true>[]) =>
  new Collection(
    messages
      .slice()
      .sort((a, b) => {
        const aId = BigInt(a.id);
        const bId = BigInt(b.id);
        return aId > bId ? 1 : aId === bId ? 0 : -1;
      })
      .map(e => [e.id, e])
  );

export const fetchMany = async (
  channel: TextChannel,
  options: FetchMessagesOptions = { limit: 50 }
): Promise<Collection<string, Message<true>>> => {
  const optionLimit = options.limit ?? 50;

  if (optionLimit <= 100) {
    return channel.messages.fetch(options);
  }

  if (typeof options.around === 'string') {
    const messages = await channel.messages.fetch({ ...options, limit: 100 });
    const limit = Math.floor((optionLimit - 100) / 2);
    if (messages.size < 100) {
      return messages;
    }
    const backward = fetchMany(channel, { limit, before: messages.last()!.id });
    const forward = fetchMany(channel, { limit, after: messages.first()!.id });
    return array2Collection(
      [messages, ...(await Promise.all([backward, forward]))].flatMap(e => [...e.values()])
    );
  }

  let temp: Collection<string, Message<true>>;

  function buildParameter() {
    const reqCnt = Math.min(optionLimit - messages.length, 100);
    if (typeof options.after === 'string') {
      const after = temp ? temp.first()!.id : options.after;
      return { ...options, limit: reqCnt, after };
    }
    const before = temp ? temp.last()!.id : options.before;
    return { ...options, limit: reqCnt, before };
  }

  const messages = [];

  while (messages.length < optionLimit) {
    const param = buildParameter();
    temp = await channel.messages.fetch(param);
    messages.push(...temp.values());
    if (param.limit > temp.size) {
      break;
    }
  }

  return array2Collection(messages);
};

export const fetchAll = async (channel: TextChannel): Promise<Message<true>[]> => {
  const messages: Message<true>[] = await channel.messages
    .fetch({ limit: 100 })
    .then(c => Array.from(c.values()))
    .catch(e => {
      console.log('初回のfetchに失敗', e.message);
      return [];
    });

  while (messages.length >= 100) {
    const last = messages.at(-1)!;

    const next: Message<true>[] = await channel.messages
      .fetch({ limit: 100, before: last.id })
      .then(c => Array.from(c.values()))
      .catch(e => {
        console.log('追加のfetchに失敗', e.message);
        return [];
      });

    messages.push(...next);

    if (next.length < 100) break;
  }

  return messages;
};
