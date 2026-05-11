import type { CommandContext, Context } from 'grammy';
import { db } from '../lib/firestore.js';
import { config } from '../config.js';

export async function projectsCommand(ctx: CommandContext<Context>): Promise<void> {
  const userId = ctx.from!.id;

  // Find Firebase user linked to this Telegram ID
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
    .collection('projects')
    .where('ownerId', '==', uid)
    .orderBy('updatedAt', 'desc')
    .limit(10)
    .get();

  if (snap.empty) {
    await ctx.reply('У тебя пока нет проектов.');
    return;
  }

  const lines = snap.docs.map((d) => {
    const data = d.data();
    const url = `${config.WEB_APP_BASE_URL}/projects/${d.id}`;
    return `• [${data['name'] as string}](${url})`;
  });

  await ctx.reply(`📁 *Твои проекты:*\n\n${lines.join('\n')}`, {
    parse_mode: 'MarkdownV2',
  });
}
