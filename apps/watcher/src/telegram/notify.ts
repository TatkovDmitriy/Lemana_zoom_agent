import { Bot, InlineKeyboard } from 'grammy';
import { config, allowedTelegramIds } from '../config.js';
import { renderTelegramMessage } from '@lemana/shared';
import type { MinuteOutput, MeetingInput } from '@lemana/shared';
import { db } from '../firestore/client.js';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

export async function notifyMinute(params: {
  output: MinuteOutput;
  input: MeetingInput;
  minuteId: string;
  catalogUrl: string;
}): Promise<void> {
  const { output, input, minuteId, catalogUrl } = params;
  const text = renderTelegramMessage(output, input);
  const keyboard = new InlineKeyboard().url('Открыть в каталоге', `${catalogUrl}/minutes/${minuteId}`);

  // Fetch telegram user IDs of allowed users who have linked accounts
  const recipientIds = await getRecipientIds();

  for (const userId of recipientIds) {
    try {
      await bot.api.sendMessage(userId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    } catch (err) {
      // Log delivery failure but don't stop other deliveries
      console.error(`[telegram] Failed to send to ${userId}:`, (err as Error).message);
    }
  }
}

async function getRecipientIds(): Promise<number[]> {
  if (allowedTelegramIds.length === 0) return [];

  // Only send to users who have linked their Telegram account
  const snap = await db
    .collection('users')
    .where('telegramUserId', '!=', null)
    .get();

  const linkedIds = snap.docs
    .map((d) => d.data()['telegramUserId'] as number)
    .filter((id) => allowedTelegramIds.includes(id));

  return linkedIds;
}
