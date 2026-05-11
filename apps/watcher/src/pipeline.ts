import { summarize } from './summarizer/claude.js';
import { saveMinute, updateMinuteObsidian } from './firestore/minutes.js';
import { commitFile } from './obsidian/github.js';
import { updateIndexPage } from './obsidian/index-page.js';
import { notifyMinute } from './telegram/notify.js';
import { config } from './config.js';
import { buildObsidianFrontmatter, buildObsidianFileName } from '@lemana/shared';
import type { ProcessRecordingPayload } from '@lemana/shared';
import { db } from './firestore/client.js';
import { Timestamp } from 'firebase-admin/firestore';

const DEFAULT_OBSIDIAN_FOLDER = '10_Projects/Pet_Projects/Lemana_Zoom_Agent';

export async function processRecording(
  jobId: string,
  payload: ProcessRecordingPayload,
): Promise<void> {
  console.log(`[pipeline] processing job ${jobId}, meeting ${payload.meetingId}`);

  await db
    .collection('jobs')
    .doc(jobId)
    .update({ status: 'in_progress', updatedAt: Timestamp.now() });

  try {
    const input = {
      meetingId: payload.meetingId,
      topic: payload.topic,
      startedAt: payload.startedAt,
      durationMin: payload.durationMin,
      participants: payload.participants,
      transcript: payload.transcript ?? (await fetchTranscript(payload.transcriptUrl)),
      ownerId: payload.ownerId,
      recordingUrl: payload.recordingUrl,
    };

    // Determine project for this minute (inbox by default)
    const projectId = payload.projectIdHint ?? (await getDefaultProjectId(payload.ownerId));

    const catalogUrl = `${config.WEB_APP_BASE_URL}`;
    const output = await summarize(input, catalogUrl);

    // Save to Firestore
    const minuteId = await saveMinute({
      output,
      input,
      ownerId: payload.ownerId,
      projectId,
      zoomMeetingId: payload.meetingId,
      zoomRecordingUrl: payload.recordingUrl,
    });

    const minuteUrl = `${config.WEB_APP_BASE_URL}/minutes/${minuteId}`;
    output.markdown = output.markdown.replace(catalogUrl, minuteUrl);

    // Determine Obsidian folder
    const obsidianFolder = await getObsidianFolder(projectId) ?? DEFAULT_OBSIDIAN_FOLDER;

    // Commit to Obsidian
    const fileName = buildObsidianFileName(input.startedAt, output.meetingType, input.topic);
    const obsidianPath = `${obsidianFolder}/98_Meetings_and_Logs/${fileName}`;
    const frontmatter = buildObsidianFrontmatter({
      output,
      input,
      minuteId,
      projectId,
      catalogUrl: minuteUrl,
      zoomMeetingId: payload.meetingId,
      zoomRecordingUrl: payload.recordingUrl,
    });
    const fileContent = frontmatter + output.markdown;

    const commitSha = await commitFile(
      obsidianPath,
      fileContent,
      `feat: add meeting minute ${fileName}`,
    );

    await updateMinuteObsidian(minuteId, obsidianPath, commitSha);
    await updateIndexPage({ obsidianFolder, output, input, minuteId, catalogUrl: minuteUrl });

    // Notify via Telegram
    await notifyMinute({ output, input, minuteId, catalogUrl: config.WEB_APP_BASE_URL });

    await db
      .collection('jobs')
      .doc(jobId)
      .update({ status: 'done', updatedAt: Timestamp.now() });

    console.log(`[pipeline] job ${jobId} done. minuteId=${minuteId}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] job ${jobId} failed:`, error);
    await db.collection('jobs').doc(jobId).update({
      status: 'failed',
      error,
      updatedAt: Timestamp.now(),
    });
    throw err;
  }
}

async function fetchTranscript(url?: string): Promise<string> {
  if (!url) return '[транскрипт недоступен]';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch transcript: ${res.status}`);
  return res.text();
}

async function getDefaultProjectId(ownerId: string): Promise<string> {
  const snap = await db
    .collection('projects')
    .where('ownerId', '==', ownerId)
    .where('slug', '==', 'inbox')
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0]!.id;

  // Create inbox project if it doesn't exist
  const ref = await db.collection('projects').add({
    ownerId,
    name: 'Входящие',
    slug: 'inbox',
    description: 'Минутки без проекта',
    color: null,
    obsidianFolder: DEFAULT_OBSIDIAN_FOLDER,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

async function getObsidianFolder(projectId: string): Promise<string | null> {
  const doc = await db.collection('projects').doc(projectId).get();
  return (doc.data()?.[`obsidianFolder`] as string | null) ?? null;
}
