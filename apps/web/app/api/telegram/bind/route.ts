import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';

export const POST = withAuth(async (_req, uid) => {
  const code = randomBytes(12).toString('hex');
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 min

  await adminDb.collection('telegram_bindings').doc(code).set({
    uid,
    expiresAt,
  });

  return NextResponse.json({ code, expiresAt: expiresAt.toDate().toISOString() });
});
