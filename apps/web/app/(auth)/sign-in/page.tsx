'use client';

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(getClientAuth(), provider);
      router.push('/projects');
    } catch (e) {
      const code = (e as { code?: string }).code ?? 'unknown';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // пользователь закрыл попап — не показываем ошибку
      } else if (code === 'auth/invalid-api-key') {
        setError('Ошибка конфигурации Firebase. Проверьте переменные окружения на Vercel.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('Домен не авторизован в Firebase Console → Authentication → Settings → Authorized domains.');
      } else {
        setError(`Ошибка входа: ${code}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Lemana Zoom Agent</h1>
          <p className="text-sm text-muted-foreground">Каталог минуток встреч</p>
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Входим…' : 'Войти через Google'}
        </button>
      </div>
    </main>
  );
}
