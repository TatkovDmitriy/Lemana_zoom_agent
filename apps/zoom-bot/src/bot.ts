import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { config } from './config.js';
import { parseZoomUrl } from './zoom/url.js';
import { startAudioCapture, type AudioCapture } from './audio.js';

export type BotResult = {
  audioFile: string;
  startedAt: string;
  endedAt: string;
  durationMin: number;
};

export type JoinOptions = {
  meetingUrl: string;
  password?: string;
  jobId: string;
};

const MOCK_TRANSCRIPT_MARKER = '__MOCK_AUDIO__';

export async function runBot({ meetingUrl, password, jobId }: JoinOptions): Promise<BotResult> {
  const { meetingId } = parseZoomUrl(meetingUrl);
  const audioFile = `/tmp/zoom-bot-${jobId}-${meetingId}.mp3`;
  const startedAt = new Date().toISOString();

  if (config.BOT_MODE === 'mock') {
    return runMock({ audioFile, startedAt });
  }

  return runReal({ meetingUrl, password, meetingId, audioFile, startedAt });
}

async function runMock({
  audioFile,
  startedAt,
}: {
  audioFile: string;
  startedAt: string;
}): Promise<BotResult> {
  console.log('[bot] BOT_MODE=mock — simulating 30s meeting');
  // Mock mode: write a sentinel so transcribe() returns a placeholder
  // instead of calling Whisper on a non-existent recording.
  await writeFile(audioFile, MOCK_TRANSCRIPT_MARKER);
  await new Promise((r) => setTimeout(r, 30_000));

  const endedAt = new Date().toISOString();
  return { audioFile, startedAt, endedAt, durationMin: 1 };
}

async function runReal({
  meetingUrl,
  password,
  meetingId,
  audioFile,
  startedAt,
}: {
  meetingUrl: string;
  password?: string;
  meetingId: string;
  audioFile: string;
  startedAt: string;
}): Promise<BotResult> {
  if (!config.ZOOM_SDK_KEY || !config.ZOOM_SDK_SECRET) {
    throw new Error(
      'BOT_MODE=real but ZOOM_SDK_KEY/SECRET are missing — see apps/zoom-bot/README.md',
    );
  }

  console.log(`[bot] joining meeting ${meetingId} as "${config.ZOOM_BOT_NAME}"`);
  const capture: AudioCapture = await startAudioCapture(audioFile);

  // The Zoom Linux Meeting SDK ships as a binary that must be downloaded
  // manually from https://developers.zoom.us/docs/meeting-sdk/linux/ and
  // placed at ZOOM_SDK_BINARY. The wrapper invocation below assumes a CLI
  // that accepts --meeting-id / --password / --display-name. Adjust the
  // arguments to match the binary you ship; see README for details.
  const sdkProc = spawn(
    config.ZOOM_SDK_BINARY,
    [
      '--meeting-id', meetingId,
      '--password', password ?? '',
      '--display-name', config.ZOOM_BOT_NAME,
      '--sdk-key', config.ZOOM_SDK_KEY,
      '--sdk-secret', config.ZOOM_SDK_SECRET,
      '--meeting-url', meetingUrl,
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );

  await new Promise<void>((resolve, reject) => {
    sdkProc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Zoom SDK exited with code ${code}`));
    });
    sdkProc.on('error', reject);
  });

  await capture.stop();

  const endedAt = new Date().toISOString();
  const durationMin = Math.max(
    1,
    Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000),
  );
  return { audioFile, startedAt, endedAt, durationMin };
}

export { MOCK_TRANSCRIPT_MARKER };
