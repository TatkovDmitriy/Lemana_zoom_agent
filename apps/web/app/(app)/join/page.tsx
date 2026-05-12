'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { onSnapshot, doc, type Timestamp } from 'firebase/firestore';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getClientDb } from '@/lib/firebase-client';
import { cn } from '@/lib/utils';

type JobStatus = 'pending' | 'in_progress' | 'done' | 'failed';

type Heartbeat = {
  at?: Timestamp;
  durationMin: number;
  inMeeting: boolean;
  audioOk: boolean;
};

type JobDoc = {
  status?: JobStatus;
  error?: string;
  heartbeat?: Heartbeat;
  stopRequestedAt?: Timestamp | null;
  processJobId?: string;
};

export default function JoinMeetingPage() {
  const auth = useAuth();
  const router = useRouter();

  const [meetingUrl, setMeetingUrl] = useState('');
  const [password, setPassword] = useState('');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobDoc | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (auth.status === 'unauthenticated') router.replace('/sign-in');
  }, [auth.status, router]);

  useEffect(() => {
    if (!jobId || auth.status !== 'authenticated') return;
    const ref = doc(getClientDb(), 'jobs', jobId);
    const unsub = onSnapshot(
      ref,
      (snap) => setJob((snap.data() as JobDoc | undefined) ?? null),
      (err) => {
        console.warn('[join] onSnapshot error', err);
        if ((err as { code?: string }).code === 'permission-denied') {
          sessionStorage.removeItem('activeJobId');
          setJobId(null);
        }
        toast.error(
          'Не удалось подписаться на статус (проверьте firestore.rules для jobs)',
        );
      },
    );
    return () => unsub();
  }, [jobId, auth.status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (auth.status !== 'authenticated') return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bot/join', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await auth.user.getIdToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingUrl,
          password: password || undefined,
          topic: topic || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        jobId?: string;
        error?: { formErrors?: string[] };
      };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error?.formErrors?.[0] ?? 'Не удалось отправить бота');
      }
      setJobId(data.jobId);
      sessionStorage.setItem('activeJobId', data.jobId);
      setJob({ status: 'pending' });
      toast.success('Бот отправлен на встречу');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStop() {
    if (!jobId || auth.status !== 'authenticated' || stopping) return;
    setStopping(true);
    try {
      const res = await fetch(`/api/bot/jobs/${jobId}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await auth.user.getIdToken()}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Не удалось остановить');
      }
      toast.success('Запись остановлена, обрабатываем…');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setStopping(false);
    }
  }

  function handleReset() {
    setJobId(null);
    sessionStorage.removeItem('activeJobId');
    setJob(null);
    setMeetingUrl('');
    setPassword('');
    setTopic('');
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('activeJobId');
    if (saved) setJobId(saved);
  }, []);

  if (auth.status === 'loading') {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (jobId) {
    return (
      <BotStatusPanel
        job={job}
        stopping={stopping}
        onStop={handleStop}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Подключить бота</h1>
          <p className="text-sm text-muted-foreground">Бот запишет и расшифрует встречу</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Ссылка на встречу *</label>
          <Input
            type="url"
            placeholder="https://zoom.us/j/..."
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Пароль встречи</label>
          <Input
            type="text"
            placeholder="Необязательно"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Тема встречи</label>
          <Input
            type="text"
            placeholder="Например: Синк по проекту X"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Отправить бота <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function ProcessingTimer({
  startedAt,
  meetingMin,
}: {
  startedAt: Date;
  meetingMin: number;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedStr = mins > 0 ? `${mins} мин ${secs} с` : `${secs} с`;

  const low = Math.max(1, Math.round(meetingMin * 0.1));
  const high = Math.max(low + 1, Math.round(meetingMin * 0.3));

  return (
    <p className="text-xs text-muted-foreground">
      Прошло: {elapsedStr} · обычно занимает {low}–{high} мин
    </p>
  );
}

function BotStatusPanel({
  job,
  stopping,
  onStop,
  onReset,
}: {
  job: JobDoc | null;
  stopping: boolean;
  onStop: () => void;
  onReset: () => void;
}) {
  const status = job?.status;
  const hb = job?.heartbeat;
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const isProcessing = status === 'in_progress' && job?.stopRequestedAt != null;
  const processStartedAt = isProcessing ? new Date() : null;

  const steps = [
    {
      label: 'Бот подключается',
      done: !!hb || isDone || isFailed || isProcessing,
      active: status === 'pending',
    },
    {
      label: 'Бот в митинге',
      done: (hb?.inMeeting ?? false) || isDone || isFailed || isProcessing,
      active: status === 'in_progress' && !(hb?.inMeeting ?? false),
    },
    {
      label: 'Аудио работает',
      done: (hb?.audioOk ?? false) || isDone || isFailed || isProcessing,
      active: status === 'in_progress' && (hb?.inMeeting ?? false) && !(hb?.audioOk ?? false),
    },
    {
      label: hb?.durationMin ? `Запись: ${hb.durationMin} мин` : 'Идёт запись',
      done: isDone || isFailed || isProcessing,
      active:
        status === 'in_progress' &&
        (hb?.audioOk ?? false) &&
        job?.stopRequestedAt == null,
    },
    {
      label: 'Обработка',
      done: isDone,
      active: isProcessing,
    },
  ];

  if (job === null) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Бот на встрече</h1>
          <p className="text-sm text-muted-foreground">Статус обновляется в реальном времени.</p>
        </div>
      </div>

      <div className="rounded-xl border p-4 flex flex-col gap-3 mb-6">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2">
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            ) : step.active ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={cn(
                'text-sm',
                step.done
                  ? 'text-foreground'
                  : step.active
                    ? 'text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
        {isProcessing && processStartedAt && hb?.durationMin && (
          <ProcessingTimer startedAt={processStartedAt} meetingMin={hb.durationMin} />
        )}
      </div>

      {isDone && job.processJobId && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Минутка готова!{' '}
          <NextLink
            href={`/minutes/${job.processJobId}`}
            className="font-medium underline underline-offset-2"
          >
            Открыть <ArrowRight className="inline h-3.5 w-3.5" />
          </NextLink>
        </div>
      )}

      {isFailed && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Ошибка: {job.error ?? 'неизвестная ошибка'}
        </div>
      )}

      <div className="flex gap-3">
        {(isDone || isFailed) ? (
          <Button onClick={onReset} variant="outline">
            <Sparkles className="mr-1 h-4 w-4" /> Новая встреча
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onReset}>
              Свернуть
            </Button>
            <Button
              variant="destructive"
              onClick={onStop}
              disabled={stopping || job?.stopRequestedAt != null}
            >
              <Square className="mr-1 h-4 w-4" />
              {stopping
                ? 'Останавливаем…'
                : job?.stopRequestedAt != null
                  ? 'Останавливается…'
                  : 'Остановить запись'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
