import { Timestamp } from 'firebase-admin/firestore';
import type { JoinMeetingPayload, ProcessRecordingPayload } from './types.js';
import { getDb } from './firestore/client.js';
import { runBot } from './bot.js';
import { transcribeAudio } from './transcribe.js';
import { parseZoomUrl } from './zoom/url.js';

const HEARTBEAT_INTERVAL_MS = 30_000;

function buildHeartbeat(startMs: number, inMeeting: boolean, audioOk: boolean) {
  return {
    at: Timestamp.now(),
    durationMin: Math.round((Date.now() - startMs) / 60_000),
    inMeeting,
    audioOk,
  };
}

export async function processJoinMeeting(
  jobId: string,
  payload: JoinMeetingPayload,
): Promise<void> {
  console.log(`[zoom-bot] picking up join job ${jobId} → ${payload.meetingUrl}`);
  const startMs = Date.now();

  await getDb()
    .collection('jobs')
    .doc(jobId)
    .update({
      status: 'in_progress',
      heartbeat: buildHeartbeat(startMs, true, true),
      updatedAt: Timestamp.now(),
    });

  // Push a fresh heartbeat every HEARTBEAT_INTERVAL_MS while the bot is in
  // the meeting. The web /join status panel subscribes to this doc via
  // onSnapshot and uses the heartbeat to render the live status rows.
  const heartbeatTimer = setInterval(() => {
    void getDb()
      .collection('jobs')
      .doc(jobId)
      .update({ heartbeat: buildHeartbeat(startMs, true, true) })
      .catch((err: unknown) => console.warn('[zoom-bot] heartbeat update failed:', err));
  }, HEARTBEAT_INTERVAL_MS);

  try {
    const { meetingId } = parseZoomUrl(payload.meetingUrl);

    const result = await runBot({
      meetingUrl: payload.meetingUrl,
      password: payload.password,
      jobId,
    });

    clearInterval(heartbeatTimer);

    // Meeting wait finished (host hang-up, timeout, or stop signal). Mark
    // inMeeting=false so the UI flips into the "Обработка…" state while we
    // transcribe + summarize.
    await getDb()
      .collection('jobs')
      .doc(jobId)
      .update({
        heartbeat: {
          at: Timestamp.now(),
          durationMin: result.durationMin,
          inMeeting: false,
          audioOk: true,
        },
        updatedAt: Timestamp.now(),
      })
      .catch(() => {});

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

    const ref = await getDb().collection('jobs').add({
      type: 'process_recording',
      status: 'pending',
      payload: processPayload,
      attempts: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await getDb().collection('jobs').doc(jobId).update({
      status: 'done',
      processJobId: ref.id,
      updatedAt: Timestamp.now(),
    });

    console.log(`[zoom-bot] join job ${jobId} done; spawned process_recording job ${ref.id}`);
  } catch (err) {
    clearInterval(heartbeatTimer);
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[zoom-bot] join job ${jobId} failed:`, error);
    await getDb()
      .collection('jobs')
      .doc(jobId)
      .update({
        status: 'failed',
        error,
        heartbeat: buildHeartbeat(startMs, false, false),
        updatedAt: Timestamp.now(),
      })
      .catch(() => {});
  }
}
