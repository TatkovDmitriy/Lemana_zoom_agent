'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getClientAuth } from '@/lib/firebase-client';
import { Button } from '@/components/ui/button';

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
        // user closed popup — no error
      } else if (code === 'auth/invalid-api-key') {
        setError('Ошибка конфигурации Firebase. Проверьте переменные окружения на Vercel.');
      } else if (code === 'auth/unauthorized-domain') {
        setError(
          'Домен не авторизован в Firebase Console → Authentication → Settings → Authorized domains.',
        );
      } else {
        setError(`Ошибка входа: ${code}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Lemana Zoom Agent</h1>
            <p className="text-sm text-muted-foreground">Каталог минуток встреч</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Входим…' : 'Войти через Google'}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Только для авторизованных пользователей
        </p>
      </div>
    </main>
  );
}
