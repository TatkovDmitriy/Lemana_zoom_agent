'use client';

import { useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; token: string };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const auth = getClientAuth();
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ status: 'unauthenticated' });
      } else {
        const token = await user.getIdToken();
        setState({ status: 'authenticated', user, token });
      }
    });
  }, []);

  return state;
}
