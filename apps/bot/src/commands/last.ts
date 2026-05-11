import type { CommandContext, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { db } from '../lib/firestore.js';
import { config } from '../config.js';
import { renderTelegramMessage } from '@lemana/shared';
import type { Minute } from '@lemana/shared';
import type { Timestamp } from 'firebase-admin/firestore';

export async function lastCommand(ctx: CommandContext<Context>): Promise<void> {
  const userId = ctx.from!.id;

  const userSnap = await db
    .collection('users')
    .where('telegramUserId', '==', userId)
    .limit(1)
    .get();

  if (userSnap.empty) {
    await ctx.reply('⚠️ Аккаунт не привязан. Введи /start для привязки.');
    return;
  }

  const uid = userSnap.docs[0]!.id;
  const snap = await db
    .collection('minutes')
    .where('ownerId', '==', uid)
    .orderBy('date', 'desc')
    .limit(1)
    .get();

  if (snap.empty) {
    await ctx.reply('Минуток пока нет.');
    return;
  }

  const doc = snap.docs[0]!;
  const minute = { id: doc.id, ...doc.data() } as Minute & { date: Timestamp };

  const text = renderTelegramMessage(
    {
      title: minute.title,
      meetingType: minute.meetingType,
      summary: minute.summary,
      decisions: minute.decisions,
      actionItems: minute.actionItems,
      openQuestions: minute.openQuestions,
      nextSteps: minute.nextSteps,
      markdown: minute.markdown,
    },
    {
      startedAt: minute.date.toDate().toISOString(),
      durationMin: minute.durationMin,
      participants: minute.participants,
    },
  );

  const keyboard = new InlineKeyboard().url(
    'Открыть в каталоге',
    `${config.WEB_APP_BASE_URL}/minutes/${minute.id}`,
  );

  await ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: keyboard });
}
