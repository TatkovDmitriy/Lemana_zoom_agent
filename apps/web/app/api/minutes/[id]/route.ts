import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { PatchMinuteSchema, UpdateMinuteSchema } from '@lemana/shared';
import { Timestamp } from 'firebase-admin/firestore';

// Combined accept-set: metadata fields (title/tags/projectId from
// UpdateMinuteSchema) + content sections (summary/decisions/actionItems/
// openQuestions/nextSteps from PatchMinuteSchema, used by inline edits on
// /minutes/[id]).
const CombinedPatchSchema = UpdateMinuteSchema.merge(PatchMinuteSchema);

async function getOwnedMinute(id: string, uid: string) {
  const doc = await adminDb.collection('minutes').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data['ownerId'] !== uid) return null;
  return {
    id: doc.id,
    ...data,
    decisions: data['decisions'] ?? [],
    actionItems: data['actionItems'] ?? [],
    openQuestions: data['openQuestions'] ?? [],
    nextSteps: data['nextSteps'] ?? [],
    participants: data['participants'] ?? [],
  };
}

export const GET = withAuth(async (req, uid) => {
  const id = req.nextUrl.pathname.split('/').at(-1)!;
  const minute = await getOwnedMinute(id, uid);
  if (!minute) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(minute);
});

export const PATCH = withAuth(async (req, uid) => {
  const id = req.nextUrl.pathname.split('/').at(-1)!;
  const minute = await getOwnedMinute(id, uid);
  if (!minute) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = CombinedPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Empty patch' }, { status: 400 });
  }
  await adminDb
    .collection('minutes')
    .doc(id)
    .update({ ...parsed.data, updatedAt: Timestamp.now() });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req, uid) => {
  const id = req.nextUrl.pathname.split('/').at(-1)!;
  const minute = await getOwnedMinute(id, uid);
  if (!minute) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await adminDb.collection('minutes').doc(id).delete();
  return NextResponse.json({ ok: true });
});
