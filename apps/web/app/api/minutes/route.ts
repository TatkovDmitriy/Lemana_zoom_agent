import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

export const GET = withAuth(async (req, uid) => {
  const { searchParams } = req.nextUrl;
  const projectId = searchParams.get('projectId');
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
  const cursor = searchParams.get('cursor');

  // Equality filters must come before orderBy — build base query first
  const base = adminDb.collection('minutes').where('ownerId', '==', uid);
  const filtered =
    projectId === 'null'
      ? base.where('projectId', '==', null)
      : projectId
        ? base.where('projectId', '==', projectId)
        : base;
  let query = filtered.orderBy('date', 'desc').limit(limit);

  if (cursor) {
    const cursorDoc = await adminDb.collection('minutes').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc) as typeof query;
  }

  const snap = await query.get();
  const minutes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Only return cursor if a full page was returned (there may be more)
  const nextCursor = snap.docs.length === limit ? (snap.docs.at(-1)?.id ?? null) : null;

  return NextResponse.json({ minutes, nextCursor });
});
