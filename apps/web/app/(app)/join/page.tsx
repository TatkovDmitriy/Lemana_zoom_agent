'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Video, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function JoinMeetingPage() {
  const auth = useAuth();
  const router = useRouter();
  const [meetingUrl, setMeetingUrl] = useState('');
  const [password, setPassword] = useState('');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.status === 'unauthenticated') router.replace('/sign-in');
  }, [auth.status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (auth.status !== 'authenticated') return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bot/join', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingUrl,
          password: password || undefined,
          topic: topic || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.formErrors?.[0] ?? 'Не удалось отправить бота');
      }
      toast.success('Бот отправлен на встречу — минутка появится во Входящих');
      setMeetingUrl('');
      setPassword('');
      setTopic('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <header className="mb-8 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Подключить бота</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Вставьте ссылку на Zoom-встречу — бот зайдёт, запишет аудио и оставит минутку
            во Входящих.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" />
              Ссылка на встречу
            </span>
          </label>
          <Input
            required
            type="url"
            placeholder="https://zoom.us/j/123456789"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Пароль <span className="text-muted-foreground">(если есть)</span>
            </label>
            <Input
              placeholder="abc123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Название <span className="text-muted-foreground">(необязательно)</span>
            </label>
            <Input
              placeholder="Синк по фичам"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={submitting || !meetingUrl.trim()}>
            {submitting ? 'Отправляем…' : 'Подключить бота'}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Бот участвует во встрече как обычный участник под именем «Lemana AI». После
          окончания встречи аудио транскрибируется через Whisper, текст уходит в Claude
          и минутка появляется в каталоге. Если что-то пошло не так — задача отметится
          как <code className="rounded bg-muted px-1 py-0.5">failed</code> в Firestore.
        </p>
      </div>
    </div>
  );
}
