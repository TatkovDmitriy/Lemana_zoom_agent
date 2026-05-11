import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

export const GET = withAuth(async (req, uid) => {
  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get('projectId');
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
  const cursor = searchParams.get('cursor');

  let query = adminDb
    .collection('minutes')
    .where('ownerId', '==', uid)
    .orderBy('date', 'desc')
    .limit(limit);

  if (projectId) query = query.where('projectId', '==', projectId) as typeof query;

  if (cursor) {
    const cursorDoc = await adminDb.collection('minutes').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc) as typeof query;
  }

  const snap = await query.get();
  const minutes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.at(-1)?.id ?? null;

  return NextResponse.json({ minutes, nextCursor });
});
