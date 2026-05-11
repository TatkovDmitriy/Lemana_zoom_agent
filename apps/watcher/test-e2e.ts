/**
 * End-to-end mock test:
 *   Claude API → Firestore → Obsidian commit → (Telegram skipped if no user_id set)
 *
 * Run from repo root:
 *   pnpm tsx --env-file .env.local apps/watcher/test-e2e.ts
 */
import 'dotenv/config';
import { config } from './src/config.js';
import { summarize } from './src/summarizer/claude.js';
import { saveMinute, updateMinuteObsidian } from './src/firestore/minutes.js';
import { commitFile } from './src/obsidian/github.js';
import { updateIndexPage } from './src/obsidian/index-page.js';
import { buildObsidianFrontmatter, buildObsidianFileName } from '@lemana/shared';
import { MOCK_MEETING } from './src/zoom/mock.js';

const WEB_URL = config.WEB_APP_BASE_URL;
const OBSIDIAN_FOLDER = '10_Projects/Pet_Projects/Lemana_Zoom_Agent';

async function run() {
  console.log('\n=== Lemana Zoom Agent — E2E Mock Test ===\n');

  // ── 1. Summarize ──────────────────────────────────────────────
  console.log('1. Calling Anthropic API…');
  const catalogUrl = `${WEB_URL}/minutes/test-preview`;
  const output = await summarize(MOCK_MEETING, catalogUrl);
  console.log(`   ✅ title: "${output.title}"`);
  console.log(`   ✅ meetingType: ${output.meetingType}`);
  console.log(`   ✅ decisions: ${output.decisions.length}`);
  console.log(`   ✅ actionItems: ${output.actionItems.length}`);

  // ── 2. Save to Firestore ──────────────────────────────────────
  console.log('\n2. Saving to Firestore…');
  const minuteId = await saveMinute({
    output,
    input: MOCK_MEETING,
    ownerId: MOCK_MEETING.ownerId,
    projectId: 'inbox',
    zoomMeetingId: MOCK_MEETING.meetingId,
    zoomRecordingUrl: MOCK_MEETING.recordingUrl,
  });
  console.log(`   ✅ minuteId: ${minuteId}`);

  // ── 3. Commit to Obsidian ─────────────────────────────────────
  console.log('\n3. Committing to Obsidian repo…');
  const minuteUrl = `${WEB_URL}/minutes/${minuteId}`;
  output.markdown = output.markdown.replace(catalogUrl, minuteUrl);

  const fileName = buildObsidianFileName(
    MOCK_MEETING.startedAt,
    output.meetingType,
    MOCK_MEETING.topic,
  );
  const obsidianPath = `${OBSIDIAN_FOLDER}/98_Meetings_and_Logs/${fileName}`;
  const frontmatter = buildObsidianFrontmatter({
    output,
    input: MOCK_MEETING,
    minuteId,
    projectId: 'inbox',
    catalogUrl: minuteUrl,
    zoomMeetingId: MOCK_MEETING.meetingId,
    zoomRecordingUrl: MOCK_MEETING.recordingUrl,
  });

  const commitSha = await commitFile(
    obsidianPath,
    frontmatter + output.markdown,
    `feat: add mock test minute ${fileName}`,
  );
  console.log(`   ✅ file: ${obsidianPath}`);
  console.log(`   ✅ commit: ${commitSha.slice(0, 10)}`);

  await updateMinuteObsidian(minuteId, obsidianPath, commitSha);

  // ── 4. Update Obsidian index ──────────────────────────────────
  console.log('\n4. Updating Obsidian index page…');
  await updateIndexPage({
    obsidianFolder: OBSIDIAN_FOLDER,
    output,
    input: MOCK_MEETING,
    minuteId,
    catalogUrl: minuteUrl,
  });
  console.log('   ✅ index updated');

  // ── 5. Telegram (skipped without user_id) ─────────────────────
  console.log('\n5. Telegram notification…');
  if (!process.env['TELEGRAM_ALLOWED_USER_IDS']) {
    console.log('   ⚠️  TELEGRAM_ALLOWED_USER_IDS not set — skipping');
  } else {
    const { notifyMinute } = await import('./src/telegram/notify.js');
    await notifyMinute({ output, input: MOCK_MEETING, minuteId, catalogUrl: WEB_URL });
    console.log('   ✅ sent');
  }

  console.log('\n=== DONE ===');
  console.log(`Firestore minute ID : ${minuteId}`);
  console.log(`Obsidian path       : ${obsidianPath}`);
  console.log(`Web URL             : ${minuteUrl}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
