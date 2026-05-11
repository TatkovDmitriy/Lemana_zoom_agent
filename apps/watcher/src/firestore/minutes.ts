import { Timestamp } from 'firebase-admin/firestore';
import { db } from './client.js';
import { buildSearchTokens } from '@lemana/shared';
import type { MinuteOutput, MeetingInput } from '@lemana/shared';

export async function saveMinute(params: {
  output: MinuteOutput;
  input: MeetingInput;
  ownerId: string;
  projectId: string;
  zoomMeetingId?: string;
  zoomRecordingUrl?: string;
}): Promise<string> {
  const { output, input, ownerId, projectId, zoomMeetingId, zoomRecordingUrl } = params;
  const searchTokens = buildSearchTokens(
    output.title,
    input.participants,
    input.topic,
    output.summary,
  );
  const now = Timestamp.now();
  const ref = await db.collection('minutes').add({
    ownerId,
    projectId,
    title: output.title,
    date: Timestamp.fromDate(new Date(input.startedAt)),
    durationMin: input.durationMin,
    participants: input.participants,
    topic: input.topic,
    meetingType: output.meetingType,
    zoomMeetingId: zoomMeetingId ?? null,
    zoomRecordingUrl: zoomRecordingUrl ?? null,
    summary: output.summary,
    decisions: output.decisions,
    actionItems: output.actionItems,
    openQuestions: output.openQuestions,
    nextSteps: output.nextSteps,
    markdown: output.markdown,
    tags: ['meeting', 'zoom', `meeting/${output.meetingType}`],
    searchTokens,
    status: 'done',
    obsidianPath: null,
    obsidianCommitSha: null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateMinuteObsidian(
  id: string,
  obsidianPath: string,
  obsidianCommitSha: string,
): Promise<void> {
  await db
    .collection('minutes')
    .doc(id)
    .update({ obsidianPath, obsidianCommitSha, updatedAt: Timestamp.now() });
}
