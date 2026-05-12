import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

export const POST = withAuth(async (req, uid) => {
  const parts = req.nextUrl.pathname.split('/');
  const jobId = parts.at(-2);
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const ref = adminDb.collection('jobs').doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const data = snap.data()!;
  if (data['payload']?.['ownerId'] !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = data['status'];
  if (status === 'done' || status === 'failed') {
    return NextResponse.json({ error: 'Job already finished' }, { status: 409 });
  }

  await ref.update({
    stopRequestedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return NextResponse.json({ ok: true });
});
