import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

export const GET = withAuth(async (_req, uid) => {
  const snap = await adminDb
    .collection('minutes')
    .where('ownerId', '==', uid)
    .where('projectId', '==', null)
    .count()
    .get();

  return NextResponse.json({ count: snap.data().count });
});
