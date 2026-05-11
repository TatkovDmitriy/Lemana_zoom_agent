import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from './firebase-admin';

export type AuthenticatedHandler = (
  req: NextRequest,
  uid: string,
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return handler(req, decoded.uid);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}
