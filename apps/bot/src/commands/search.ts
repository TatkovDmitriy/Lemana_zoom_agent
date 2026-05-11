import type { CommandContext, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { db } from '../lib/firestore.js';
import { config } from '../config.js';
import type { DocumentData, Timestamp } from 'firebase-admin/firestore';

type MinuteDoc = DocumentData & {
  id: string;
  searchTokens: string[];
  date: Timestamp;
  title: string;
  durationMin: number;
};

export async function searchCommand(ctx: CommandContext<Context>): Promise<void> {
  const query = ctx.match.trim();
  if (!query) {
    await ctx.reply('Использование: /search <запрос>');
    return;
  }

  const userId = ctx.from!.id;
  const userSnap = await db
    .collection('users')
    .where('telegramUserId', '==', userId)
    .limit(1)
    .get();

  if (userSnap.empty) {
    await ctx.reply('⚠️ Аккаунт не привязан. Введи /start.');
    return;
  }

  const uid = userSnap.docs[0]!.id;
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 5);

  if (tokens.length === 0) {
    await ctx.reply('Запрос слишком короткий. Введи не менее 3 символов.');
    return;
  }

  const snap = await db
    .collection('minutes')
    .where('ownerId', '==', uid)
    .where('searchTokens', 'array-contains', tokens[0])
    .orderBy('date', 'desc')
    .limit(20)
    .get();

  const remaining = tokens.slice(1);
  const minutes = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as MinuteDoc)
    .filter((m) => {
      const st = m.searchTokens ?? [];
      return remaining.every((t) => st.some((s) => s.includes(t)));
    })
    .slice(0, 5);

  if (minutes.length === 0) {
    await ctx.reply(`🔍 По запросу «${query}» ничего не найдено.`);
    return;
  }

  for (const m of minutes) {
    const date = m.date.toDate().toLocaleDateString('ru-RU');
    const keyboard = new InlineKeyboard().url(
      'Открыть',
      `${config.WEB_APP_BASE_URL}/minutes/${m.id}`,
    );
    const text = `📋 *${escapeMarkdown(m.title)}*\n🗓 ${escapeMarkdown(date)} · ${m.durationMin} мин`;
    await ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: keyboard });
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}
