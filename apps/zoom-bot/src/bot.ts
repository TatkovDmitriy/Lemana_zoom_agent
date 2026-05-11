import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import type { Page, ConsoleMessage, Response } from 'playwright';
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

// ── diagnostic helpers ──────────────────────────────────────────────────────

async function dumpPageState(page: Page, step: string): Promise<void> {
  try {
    const url = page.url();
    const title = await page.title().catch(() => '(error)');
    console.log(`[bot:diag] [${step}] url=${url} title="${title}"`);

    const screenshotPath = `/tmp/bot-${step.replace(/\s+/g, '-')}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch((e: Error) => {
      console.log(`[bot:diag] screenshot failed: ${e.message}`);
    });
    console.log(`[bot:diag] screenshot saved → ${screenshotPath}`);

    // bodyText via Playwright innerText (no DOM lib needed)
    const bodyText = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '(innerText error)');
    console.log(`[bot:diag] body text: ${bodyText.replace(/\n+/g, ' ').trim().slice(0, 500)}`);
  } catch (e) {
    console.log(`[bot:diag] dumpPageState error: ${e}`);
  }
}

async function logAllButtons(page: Page): Promise<void> {
  try {
    const btns = await page.locator('button, [role="button"]').all();
    const descriptions = await Promise.all(
      btns.slice(0, 20).map(async (btn) => {
        const text = await btn.innerText().catch(() => '');
        const id = await btn.getAttribute('id').catch(() => '') ?? '';
        return `"${text.trim().slice(0, 60)}" id="${id}"`;
      }),
    );
    console.log(`[bot:diag] buttons: ${JSON.stringify(descriptions)}`);
  } catch (e) {
    console.log(`[bot:diag] logAllButtons error: ${e}`);
  }
}

async function logAllInputs(page: Page): Promise<void> {
  try {
    const inputs = await page.locator('input').all();
    const descriptions = await Promise.all(
      inputs.slice(0, 10).map(async (inp) => {
        const type = await inp.getAttribute('type').catch(() => '') ?? '';
        const id = await inp.getAttribute('id').catch(() => '') ?? '';
        const placeholder = await inp.getAttribute('placeholder').catch(() => '') ?? '';
        const name = await inp.getAttribute('name').catch(() => '') ?? '';
        return `type="${type}" id="${id}" placeholder="${placeholder}" name="${name}"`;
      }),
    );
    console.log(`[bot:diag] inputs: ${JSON.stringify(descriptions)}`);
  } catch (e) {
    console.log(`[bot:diag] logAllInputs error: ${e}`);
  }
}

// ── real mode ───────────────────────────────────────────────────────────────

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

  // Forward browser console messages and page errors to stdout
  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text();
    if (!text.includes('favicon') && !text.includes('net::ERR')) {
      console.log(`[browser:${msg.type()}] ${text.slice(0, 200)}`);
    }
  });
  page.on('pageerror', (err: Error) => console.log(`[browser:pageerror] ${err.message}`));
  page.on('response', (res: Response) => {
    if (res.status() >= 400 && res.request().resourceType() !== 'image') {
      console.log(`[browser:http] ${res.status()} ${res.url().slice(0, 120)}`);
    }
  });

  try {
    const joinUrl = `https://zoom.us/wc/join/${meetingId}`;
    console.log(`[bot] navigating to ${joinUrl}`);
    await page.goto(joinUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await dumpPageState(page, '01-after-navigate');

    // Detect if Zoom redirected away from the web client (e.g. to app download page)
    const currentUrl = page.url();
    if (!currentUrl.includes('/wc/')) {
      console.log(`[bot:warn] redirected away from /wc/ — got: ${currentUrl}`);
      console.log('[bot:warn] retrying with explicit web-client params');
      await page.goto(
        `https://zoom.us/wc/${meetingId}/join?prefer_webinar=true&web=1`,
        { waitUntil: 'domcontentloaded', timeout: 30_000 },
      );
      await dumpPageState(page, '02-after-retry-navigate');
    }

    // Accept cookies if shown
    await page.locator('button:has-text("Accept")').click({ timeout: 5_000 }).catch(() => {});
    await page.locator('button:has-text("Accept All")').click({ timeout: 3_000 }).catch(() => {});

    await dumpPageState(page, '03-after-cookies');
    await logAllInputs(page);
    await logAllButtons(page);

    // Wait for name input — Zoom Web Client uses various selectors across versions
    console.log('[bot] waiting for name input');
    const nameLocator = page.locator(
      [
        'input[placeholder*="name" i]',
        'input[id*="name" i]',
        'input[data-testid*="name" i]',
        'input[aria-label*="name" i]',
        'input.preview-name-input',
        '#input-for-name',
        'input[type="text"]',
      ].join(', '),
    ).first();

    const nameVisible = await nameLocator
      .waitFor({ timeout: 20_000, state: 'visible' })
      .then(() => true)
      .catch(() => false);

    if (!nameVisible) {
      console.log('[bot:warn] name input not found after 20s — dumping page state');
      await dumpPageState(page, '04-name-input-missing');
      await logAllInputs(page);
      await logAllButtons(page);
    } else {
      await nameLocator.fill(config.ZOOM_BOT_NAME);
      console.log(`[bot] name filled: "${config.ZOOM_BOT_NAME}"`);
    }

    await dumpPageState(page, '05-after-name-fill');

    // Fill password if provided
    if (password) {
      const pwdInput = page
        .locator('input[type="password"], input[placeholder*="passcode" i], input[placeholder*="password" i]')
        .first();
      const hasPwd = await pwdInput.isVisible().catch(() => false);
      if (hasPwd) {
        console.log('[bot] filling password');
        await pwdInput.fill(password);
      }
    }

    // Click Join button
    console.log('[bot] looking for Join button');
    await logAllButtons(page);
    await page
      .locator(
        [
          'button:has-text("Join")',
          'button[type="submit"]',
          'button:has-text("Присоединиться")',
          'button:has-text("Войти")',
        ].join(', '),
      )
      .first()
      .click({ timeout: 10_000 })
      .catch(async (e: Error) => {
        console.log(`[bot:warn] join click failed: ${e.message}`);
        await dumpPageState(page, '06-join-click-failed');
        await logAllButtons(page);
      });

    await dumpPageState(page, '07-after-join-click');

    // Handle preview screen
    const joinAgainClicked = await page
      .locator('button:has-text("Join"), button:has-text("Join Meeting"), button:has-text("Присоединиться")')
      .first()
      .click({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (joinAgainClicked) console.log('[bot] clicked Join on preview screen');

    await dumpPageState(page, '08-after-preview-join');

    // Handle "Join Audio by Computer"
    const audioJoined = await page
      .locator('button:has-text("Join Audio by Computer"), button:has-text("Join Audio"), button:has-text("Computer Audio")')
      .first()
      .click({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (audioJoined) console.log('[bot] clicked Join Audio by Computer');

    await dumpPageState(page, '09-in-meeting');

    console.log('[bot] joined meeting, starting audio capture');
    const capture = await startAudioCapture(audioFile);

    // Periodic heartbeat log
    const pollInterval = setInterval(() => {
      try {
        console.log(`[bot:poll] still running, url=${page.url()}`);
      } catch {
        clearInterval(pollInterval);
      }
    }, 60_000);

    // Wait for meeting end or timeout
    try {
      await page.waitForSelector(
        [
          'text=This meeting has been ended',
          'text=The meeting has been ended',
          'text=Meeting is over',
          'text=Конференция завершена',
          'text=Хост завершил конференцию',
        ].join(', '),
        { timeout: timeoutMs },
      );
      console.log('[bot] meeting ended by host');
    } catch {
      console.log('[bot] meeting timeout reached');
    }

    clearInterval(pollInterval);
    await capture.stop();
  } finally {
    await dumpPageState(page, '99-before-close');
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
