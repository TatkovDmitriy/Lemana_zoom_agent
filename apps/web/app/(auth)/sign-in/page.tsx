'use client';

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();

  async function handleSignIn() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(clientAuth, provider);
    router.push('/projects');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Lemana Zoom Agent</h1>
          <p className="text-sm text-muted-foreground">Каталог минуток встреч</p>
        </div>
        <button
          onClick={handleSignIn}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Войти через Google
        </button>
      </div>
    </main>
  );
}
