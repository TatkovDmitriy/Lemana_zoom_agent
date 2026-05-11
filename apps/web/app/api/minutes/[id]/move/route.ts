import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';

const MoveSchema = z.object({ projectId: z.string().min(1) });

const handler = withAuth(async (req, uid) => {
  const parts = req.nextUrl.pathname.split('/');
  const id = parts.at(-2)!; // .../minutes/[id]/move

  const doc = await adminDb.collection('minutes').doc(id).get();
  if (!doc.exists || doc.data()!['ownerId'] !== uid) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = MoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await adminDb.collection('projects').doc(parsed.data.projectId).get();
  if (!project.exists || project.data()!['ownerId'] !== uid) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  await adminDb
    .collection('minutes')
    .doc(id)
    .update({ projectId: parsed.data.projectId, updatedAt: Timestamp.now() });

  return NextResponse.json({ ok: true });
});

export const POST = handler;
export const PATCH = handler;
