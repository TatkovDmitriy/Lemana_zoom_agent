import { createReadStream, readFileSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import OpenAI from 'openai';
import { config } from './config.js';
import { MOCK_TRANSCRIPT_MARKER } from './bot.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const MOCK_TRANSCRIPT = `[Mock-встреча — BOT_MODE=mock]

Алексей: Привет, давайте начнём синк по проекту Lemana Zoom Agent.
Мария: Согласна. На прошлой неделе мы закрыли LZA-027 — теперь минутки без проекта попадают во Входящие, и я могу одним кликом раскидать их по проектам.
Алексей: Отлично. Что по боту?
Мария: Сейчас Dev_agent_zoom_bot выкатывает LZA-028 — апп apps/zoom-bot. Mock-режим уже работает: бот «подключается» к встрече, прогоняет 30 секунд, и минутка появляется в Inbox.
Алексей: Решено: после мерджа LZA-028 ставим в работу интеграцию с реальным Zoom Linux SDK. Откроем отдельный тикет на бинарь.
Мария: Принято. Я закину задачу в бэклог до конца дня.

Решения:
- Раскатываем LZA-028 в mock-режиме на Railway, чтобы протестировать end-to-end pipeline.
- Интеграцию с реальным Zoom Linux SDK выносим в отдельный тикет.

Следующие шаги:
- Мария: создать тикет на binary integration.
- Алексей: проверить квоты Whisper API.`;

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    const head = readFileSync(audioFilePath, 'utf8').slice(0, MOCK_TRANSCRIPT_MARKER.length);
    if (head === MOCK_TRANSCRIPT_MARKER) {
      await unlink(audioFilePath).catch(() => {});
      return MOCK_TRANSCRIPT;
    }
  } catch {
    // Not a text file — assume real audio, fall through to Whisper.
  }

  const audioFile = createReadStream(audioFilePath);
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ru',
    response_format: 'text',
  });

  await unlink(audioFilePath).catch(() => {});
  return typeof transcription === 'string' ? transcription : String(transcription);
}
