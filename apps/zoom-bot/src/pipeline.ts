import { Timestamp } from 'firebase-admin/firestore';
import type { JoinMeetingPayload, ProcessRecordingPayload } from './types.js';
import { db } from './firestore/client.js';
import { runBot } from './bot.js';
import { transcribeAudio } from './transcribe.js';
import { parseZoomUrl } from './zoom/url.js';

export async function processJoinMeeting(
  jobId: string,
  payload: JoinMeetingPayload,
): Promise<void> {
  console.log(`[zoom-bot] picking up join job ${jobId} → ${payload.meetingUrl}`);

  await db
    .collection('jobs')
    .doc(jobId)
    .update({ status: 'in_progress', updatedAt: Timestamp.now() });

  try {
    const { meetingId } = parseZoomUrl(payload.meetingUrl);

    const result = await runBot({
      meetingUrl: payload.meetingUrl,
      password: payload.password,
      jobId,
    });

    console.log(`[zoom-bot] meeting ${meetingId} ended, transcribing ${result.audioFile}`);
    const transcript = await transcribeAudio(result.audioFile);

    const processPayload: ProcessRecordingPayload = {
      meetingId,
      topic: payload.topic ?? `Zoom meeting ${meetingId}`,
      startedAt: result.startedAt,
      durationMin: result.durationMin,
      participants: [],
      transcript,
      ownerId: payload.ownerId,
      projectIdHint: payload.projectIdHint,
    };

    const ref = await db.collection('jobs').add({
      type: 'process_recording',
      status: 'pending',
      payload: processPayload,
      attempts: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await db.collection('jobs').doc(jobId).update({
      status: 'done',
      updatedAt: Timestamp.now(),
      processJobId: ref.id,
    });

    console.log(`[zoom-bot] join job ${jobId} done; spawned process_recording job ${ref.id}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[zoom-bot] join job ${jobId} failed:`, error);
    await db.collection('jobs').doc(jobId).update({
      status: 'failed',
      error,
      updatedAt: Timestamp.now(),
    });
  }
}
