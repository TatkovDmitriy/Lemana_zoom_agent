import type { CommandContext, Context } from 'grammy';
import { db } from '../lib/firestore.js';
import { Timestamp } from 'firebase-admin/firestore';

export async function startCommand(ctx: CommandContext<Context>): Promise<void> {
  const userId = ctx.from!.id;
  const args = ctx.match.trim();

  if (!args) {
    await ctx.reply(
      `👋 Привет! Это Lemana Zoom Agent.\n\n` +
        `Чтобы привязать аккаунт, открой веб-каталог и получи код привязки:\n` +
        `Настройки → Telegram → «Получить код».\n\n` +
        `Затем введи: /start <код>`,
    );
    return;
  }

  // Verify one-time code
  const bindingDoc = await db.collection('telegram_bindings').doc(args).get();
  if (!bindingDoc.exists) {
    await ctx.reply('❌ Код не найден или уже использован.');
    return;
  }

  const binding = bindingDoc.data()!;
  if ((binding['expiresAt'] as Timestamp).toDate() < new Date()) {
    await ctx.reply('❌ Код истёк. Получи новый в веб-каталоге.');
    await bindingDoc.ref.delete();
    return;
  }

  const uid = binding['uid'] as string;

  // Link Telegram user ID to Firebase user
  await db.collection('users').doc(uid).set(
    { telegramUserId: userId, updatedAt: Timestamp.now() },
    { merge: true },
  );
  await bindingDoc.ref.delete();

  await ctx.reply('✅ Аккаунт успешно привязан! Теперь ты будешь получать минутки встреч.');
}
