import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { config } from './config.js';
import { parseZoomUrl } from './zoom/url.js';
import { startAudioCapture } from './audio.js';

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

async function runMock({ audioFile, startedAt }: { audioFile: string; startedAt: string }): Promise<BotResult> {
  console.log('[bot] BOT_MODE=mock — simulating 5s meeting');
  await writeFile(audioFile, MOCK_TRANSCRIPT_MARKER);
  await new Promise((r) => setTimeout(r, 5_000));
  const endedAt = new Date().toISOString();
  return { audioFile, startedAt, endedAt, durationMin: 1 };
}

async function runReal({
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
  const timeoutMs = config.MEETING_TIMEOUT_MIN * 60 * 1000;

  console.log(`[bot] launching Chromium for meeting ${meetingId}`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--disable-web-security',
      '--allow-running-insecure-content',
    ],
  });

  const context = await browser.newContext({
    permissions: ['microphone', 'camera'],
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    const joinUrl = `https://zoom.us/wc/join/${meetingId}`;
    console.log(`[bot] navigating to ${joinUrl}`);
    await page.goto(joinUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Accept cookies if shown
    await page.locator('button:has-text("Accept")').click({ timeout: 5_000 }).catch(() => {});
    await page.locator('button:has-text("Accept All")').click({ timeout: 3_000 }).catch(() => {});

    // Fill name
    console.log('[bot] filling name');
    const nameInput = page
      .locator('input[placeholder*="name"], input[id*="name"], input[data-testid*="name"]')
      .first();
    await nameInput.waitFor({ timeout: 15_000 });
    await nameInput.fill(config.ZOOM_BOT_NAME);

    // Fill password if provided
    if (password) {
      const pwdInput = page
        .locator('input[type="password"], input[placeholder*="passcode"], input[placeholder*="password"]')
        .first();
      const hasPwd = await pwdInput.isVisible().catch(() => false);
      if (hasPwd) {
        console.log('[bot] filling password');
        await pwdInput.fill(password);
      }
    }

    // Click Join button
    console.log('[bot] clicking Join');
    await page.locator('button:has-text("Join"), button[type="submit"]').first().click();

    // Handle preview screen — click Join again
    await page
      .locator('button:has-text("Join"), button:has-text("Join Meeting")')
      .first()
      .click({ timeout: 15_000 })
      .catch(() => {});

    // Handle "Join Audio by Computer"
    await page
      .locator('button:has-text("Join Audio by Computer"), button:has-text("Join Audio")')
      .first()
      .click({ timeout: 15_000 })
      .catch(() => {});

    console.log('[bot] joined meeting, starting audio capture');
    const capture = await startAudioCapture(audioFile);

    // Wait for meeting to end or timeout
    try {
      await page.waitForSelector(
        'text=This meeting has been ended, text=The meeting has been ended, text=Meeting is over',
        { timeout: timeoutMs },
      );
      console.log('[bot] meeting ended by host');
    } catch {
      console.log('[bot] meeting timeout reached');
    }

    await capture.stop();
  } finally {
    await browser.close();
  }

  const endedAt = new Date().toISOString();
  const durationMin = Math.max(
    1,
    Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000),
  );
  return { audioFile, startedAt, endedAt, durationMin };
}

export { MOCK_TRANSCRIPT_MARKER };
