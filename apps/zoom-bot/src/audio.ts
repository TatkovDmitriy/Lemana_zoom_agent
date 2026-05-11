import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export type AudioCapture = {
  outputFile: string;
  stop: () => Promise<void>;
};

// Capture audio from the default PulseAudio sink (system mix).
// FFmpeg writes 16kHz mono mp3 — optimal for Whisper API.
export async function startAudioCapture(outputFile: string): Promise<AudioCapture> {
  await mkdir(dirname(outputFile), { recursive: true });

  const ffmpeg: ChildProcess = spawn(
    'ffmpeg',
    [
      '-y',
      '-f', 'pulse',
      '-i', 'default',
      '-ac', '1',
      '-ar', '16000',
      '-acodec', 'libmp3lame',
      '-q:a', '4',
      outputFile,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  ffmpeg.stderr?.on('data', (chunk: Buffer) => {
    // FFmpeg emits progress on stderr; only surface real errors.
    const line = chunk.toString();
    if (/error/i.test(line)) console.error('[ffmpeg]', line.trim());
  });

  const exited = new Promise<void>((resolve, reject) => {
    ffmpeg.on('exit', (code) => {
      if (code === 0 || code === 255) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    ffmpeg.on('error', reject);
  });

  // Prevent Node from crashing on unhandled rejection if ffmpeg exits
  // before stop() is called (e.g. PulseAudio not ready). Error is re-thrown
  // by stop() so the caller still sees it.
  exited.catch(() => {});

  return {
    outputFile,
    stop: async () => {
      if (!ffmpeg.killed) ffmpeg.kill('SIGINT');
      await exited;
    },
  };
}
