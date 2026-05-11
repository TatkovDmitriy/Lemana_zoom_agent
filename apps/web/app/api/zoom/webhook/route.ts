import { type NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import {
  ZoomRecordingCompletedEventSchema,
  ZoomUrlValidationEventSchema,
} from '@lemana/shared';
import type { ProcessRecordingPayload } from '@lemana/shared';
import { Timestamp } from 'firebase-admin/firestore';

const SECRET = process.env['ZOOM_WEBHOOK_SECRET_TOKEN'] ?? '';

function verifyZoomSignature(req: NextRequest, rawBody: string): boolean {
  const timestamp = req.headers.get('x-zm-request-timestamp') ?? '';
  const signature = req.headers.get('x-zm-signature') ?? '';
  const message = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac('sha256', SECRET).update(message).digest('hex')}`;
  return expected === signature;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Handle Zoom URL validation challenge
  const urlValidation = ZoomUrlValidationEventSchema.safeParse(body);
  if (urlValidation.success) {
    const { plainToken } = urlValidation.data.payload;
    const hashForValidation = createHmac('sha256', SECRET).update(plainToken).digest('hex');
    return NextResponse.json({ plainToken, encryptedToken: hashForValidation });
  }

  if (!verifyZoomSignature(req, rawBody)) {
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
  }

  const parsed = ZoomRecordingCompletedEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }); // unknown event type — ack and ignore
  }

  const { object } = parsed.data.payload;
  const transcriptFile = object.recording_files.find(
    (f) => f.file_type === 'TRANSCRIPT' && f.status === 'completed',
  );
  const videoFile = object.recording_files.find(
    (f) => f.file_type === 'MP4' && f.status === 'completed',
  );

  const payload: ProcessRecordingPayload = {
    meetingId: object.id,
    topic: object.topic,
    startedAt: object.start_time,
    durationMin: object.duration,
    participants: [],
    recordingUrl: videoFile?.play_url ?? videoFile?.download_url,
    transcriptUrl: transcriptFile?.download_url,
    ownerId: object.host_id,
  };

  await adminDb.collection('jobs').add({
    type: 'process_recording',
    status: 'pending',
    payload,
    attempts: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return NextResponse.json({ ok: true });
}
