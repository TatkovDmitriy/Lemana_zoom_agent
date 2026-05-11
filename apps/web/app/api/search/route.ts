import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { SearchQuerySchema } from '@lemana/shared';

export const GET = withAuth(async (req, uid) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = SearchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { q, projectId, limit } = parsed.data;
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 10);

  if (tokens.length === 0) {
    return NextResponse.json({ minutes: [] });
  }

  let query = adminDb
    .collection('minutes')
    .where('ownerId', '==', uid)
    .where('searchTokens', 'array-contains', tokens[0])
    .orderBy('date', 'desc')
    .limit(limit * 3); // over-fetch to client-filter on remaining tokens

  if (projectId) query = query.where('projectId', '==', projectId) as typeof query;

  const snap = await query.get();
  const remaining = tokens.slice(1);
  const minutes = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => {
      const st = (m['searchTokens'] as string[]) ?? [];
      return remaining.every((t) => st.some((s) => s.includes(t)));
    })
    .slice(0, limit);

  return NextResponse.json({ minutes });
});
