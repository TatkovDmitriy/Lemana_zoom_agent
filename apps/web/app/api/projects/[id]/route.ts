import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { UpdateProjectSchema } from '@lemana/shared';
import { Timestamp } from 'firebase-admin/firestore';

async function getOwned(id: string, uid: string) {
  const doc = await adminDb.collection('projects').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data['ownerId'] !== uid) return null;
  return { id: doc.id, ...data };
}

export const GET = withAuth(async (_req, uid) => {
  const id = _req.nextUrl.pathname.split('/').at(-1)!;
  const project = await getOwned(id, uid);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(project);
});

export const PATCH = withAuth(async (req, uid) => {
  const id = req.nextUrl.pathname.split('/').at(-1)!;
  const project = await getOwned(id, uid);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await adminDb
    .collection('projects')
    .doc(id)
    .update({ ...parsed.data, updatedAt: Timestamp.now() });
  const updated = await adminDb.collection('projects').doc(id).get();
  return NextResponse.json({ id, ...updated.data() });
});

export const DELETE = withAuth(async (req, uid) => {
  const id = req.nextUrl.pathname.split('/').at(-1)!;
  const project = await getOwned(id, uid);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await adminDb.collection('projects').doc(id).delete();
  return NextResponse.json({ ok: true });
});
