import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { JoinMeetingSchema } from '@lemana/shared';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

export const POST = withAuth(async (req, uid) => {
  const body = await req.json().catch(() => null);
  const parsed = JoinMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // If projectIdHint is provided, verify it belongs to the user.
  if (parsed.data.projectIdHint) {
    const project = await adminDb
      .collection('projects')
      .doc(parsed.data.projectIdHint)
      .get();
    if (!project.exists || project.data()!['ownerId'] !== uid) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  const ref = await adminDb.collection('jobs').add({
    type: 'join_meeting',
    status: 'pending',
    payload: {
      meetingUrl: parsed.data.meetingUrl,
      password: parsed.data.password,
      topic: parsed.data.topic,
      projectIdHint: parsed.data.projectIdHint,
      ownerId: uid,
    },
    attempts: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return NextResponse.json({ ok: true, jobId: ref.id });
});
