import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { promisify } from 'node:util';
import { config } from './config.js';
import { MOCK_TRANSCRIPT_MARKER } from './bot.js';

const execFileAsync = promisify(execFile);

const MOCK_TRANSCRIPT = `[Mock-встреча — BOT_MODE=mock]

Алексей: Привет, давайте начнём синк по проекту Lemana Zoom Agent.
Мария: Согласна. На прошлой неделе мы закрыли LZA-027 — теперь минутки без проекта попадают во Входящие, и я могу одним кликом раскидать их по проектам.
Алексей: Отлично. Что по боту?
Мария: Сейчас Dev_agent_zoom_bot выкатывает LZA-028 — апп apps/zoom-bot. Транскрипция перешла на self-hosted faster-whisper, теперь это $0 за час аудио.
Алексей: Решено: после мерджа LZA-028 ставим в работу интеграцию с реальным Zoom Linux SDK. Откроем отдельный тикет на бинарь.
Мария: Принято. Я закину задачу в бэклог до конца дня.

Решения:
- Раскатываем LZA-028 в mock-режиме на Railway, чтобы протестировать end-to-end pipeline.
- Транскрипцию делает self-hosted faster-whisper (модель small, CPU/int8).
- Интеграцию с реальным Zoom Linux SDK выносим в отдельный тикет.

Следующие шаги:
- Мария: создать тикет на binary integration.
- Алексей: проверить RAM на Railway-плане.`;

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  // Mock-mode shortcut — skip the Python/model invocation entirely so dev
  // and local docker runs don't need faster-whisper installed.
  try {
    const head = readFileSync(audioFilePath, 'utf8').slice(0, MOCK_TRANSCRIPT_MARKER.length);
    if (head === MOCK_TRANSCRIPT_MARKER) {
      await unlink(audioFilePath).catch(() => {});
      return MOCK_TRANSCRIPT;
    }
  } catch {
    // Real audio binary — fall through to faster-whisper.
  }

  const { stdout } = await execFileAsync(
    'python3',
    [
      config.WHISPER_SCRIPT,
      audioFilePath,
      '--language', config.WHISPER_LANGUAGE,
      '--model', config.WHISPER_MODEL,
      '--device', config.WHISPER_DEVICE,
      '--compute-type', config.WHISPER_COMPUTE_TYPE,
    ],
    {
      // Raise stdout buffer for long transcripts.
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  await unlink(audioFilePath).catch(() => {});
  return stdout.trim();
}
