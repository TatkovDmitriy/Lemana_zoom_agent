import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { CreateProjectSchema } from '@lemana/shared';
import { Timestamp } from 'firebase-admin/firestore';

export const GET = withAuth(async (_req, uid) => {
  const snap = await adminDb
    .collection('projects')
    .where('ownerId', '==', uid)
    .orderBy('updatedAt', 'desc')
    .get();
  const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(projects);
});

export const POST = withAuth(async (req, uid) => {
  const body = await req.json();
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, description, color, obsidianFolder } = parsed.data;
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const now = Timestamp.now();
  const ref = await adminDb.collection('projects').add({
    ownerId: uid,
    name,
    slug,
    description: description ?? '',
    color: color ?? null,
    obsidianFolder: obsidianFolder ?? null,
    createdAt: now,
    updatedAt: now,
  });
  const doc = await ref.get();
  return NextResponse.json({ id: doc.id, ...doc.data() }, { status: 201 });
});
