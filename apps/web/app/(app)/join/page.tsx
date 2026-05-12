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
  Video,
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
  updatedAt?: Timestamp;
};

const ACTIVE_JOB_STORAGE_KEY = 'activeJobId';

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

  // Restore an active job from sessionStorage on mount so the status panel
  // survives navigation (LZA-034 bug 1). sessionStorage is per-tab, so a
  // brand-new tab won't accidentally hijack a job from another tab.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (saved) setJobId(saved);
  }, []);

  useEffect(() => {
    if (!jobId || auth.status !== 'authenticated') return;
    const ref = doc(getClientDb(), 'jobs', jobId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() as JobDoc | undefined) ?? null;
        setJob(data);
        // Terminal states: drop the sessionStorage handle so the next visit
        // shows the form, not a stale done/failed panel.
        if (data?.status === 'done' || data?.status === 'failed') {
          sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
        }
      },
      (err) => {
        console.warn('[join] onSnapshot error', err);
        // If the current user doesn't own this job (cross-user session),
        // clear the stale jobId so the form renders instead of a frozen skeleton.
        if ((err as { code?: string }).code === 'permission-denied') {
          sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
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
          Authorization: `Bearer ${auth.token}`,
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
      sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, data.jobId);
      setJobId(data.jobId);
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
        headers: { Authorization: `Bearer ${auth.token}` },
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
    sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    setJobId(null);
    setJob(null);
    setMeetingUrl('');
    setPassword('');
    setTopic('');
  }

  if (jobId) {
    return (
      <StatusPanel
        job={job}
        stopping={stopping}
        onStop={handleStop}
        onReset={handleReset}
      />
    );
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
          Бот участвует во встрече как обычный участник под именем «Лемана AI». После
          окончания встречи аудио транскрибируется через Whisper, текст уходит в Claude
          и минутка появляется в каталоге. Если что-то пошло не так — задача отметится
          как <code className="rounded bg-muted px-1 py-0.5">failed</code> в Firestore.
        </p>
      </div>
    </div>
  );
}

function StatusPanel({
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
  const inMeeting = hb?.inMeeting === true;
  const audioOk = hb?.audioOk === true;
  const durationMin = hb?.durationMin ?? 0;

  const isPending = status === 'pending' || !status;
  const isRunning = status === 'in_progress';
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const isProcessing = isRunning && !inMeeting;

  return (
    <div className="max-w-xl">
      <header className="mb-8 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Бот на встрече</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Статус обновляется в реальном времени.
          </p>
        </div>
      </header>

      {!job ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <div className="space-y-2.5 rounded-lg border border-border bg-card p-6">
          <StatusRow
            done={isRunning || isDone || isFailed}
            loading={isPending}
            label="Бот подключается"
          />
          <StatusRow
            done={inMeeting || isDone}
            loading={isRunning && !inMeeting && !isProcessing}
            label="Бот в митинге"
          />
          <StatusRow
            done={(inMeeting && audioOk) || isDone}
            loading={isRunning && inMeeting && !audioOk}
            label="Аудио работает"
          />
          <StatusRow
            done={isDone}
            loading={isRunning && inMeeting}
            label={
              isRunning && inMeeting
                ? `Запись: ${durationMin} мин`
                : isProcessing
                ? 'Обработка…'
                : isDone
                ? 'Готово'
                : 'Ожидание'
            }
          />
          <StatusRow
            done={isDone}
            loading={isProcessing}
            failed={isFailed}
            label={isFailed ? 'Ошибка' : 'Обработка'}
          />
          {isProcessing && (
            <ProcessingTimer
              startedAt={job?.updatedAt}
              meetingMin={hb?.durationMin ?? 0}
            />
          )}
        </div>
      )}

      {isDone && (
        <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            Готово! Минутка появилась во Входящих.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <NextLink href={'/inbox' as never}>
              <Button size="sm">
                Открыть Входящие <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </NextLink>
            <Button variant="outline" size="sm" onClick={onReset}>
              Новая встреча
            </Button>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Бот завершился с ошибкой</p>
          {job?.error && (
            <p className="mt-2 max-h-32 overflow-auto rounded bg-destructive/10 p-2 font-mono text-[11px] text-destructive/80">
              {job.error}
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-3" onClick={onReset}>
            Новая встреча
          </Button>
        </div>
      )}

      {(isPending || isRunning) && (
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            Свернуть
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onStop}
            disabled={stopping || job?.stopRequestedAt != null}
          >
            <Square className="h-3.5 w-3.5" />
            {stopping
              ? 'Останавливаем…'
              : job?.stopRequestedAt != null
              ? 'Остановка…'
              : 'Остановить запись'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Processing timer ────────────────────────────────────────────────────────────────────
//
// Shown under the "Обработка" status row when the bot has left the meeting
// (heartbeat.inMeeting === false) and the watcher is transcribing /
// summarising. Ticks every second; the hint uses the actual meeting length
// to give the user a realistic ETA. faster-whisper large-v3 on CPU at int8
// runs roughly 0.1–0.3× realtime, so a 30-min call ⇒ ~3–9 min processing.

function ProcessingTimer({
  startedAt,
  meetingMin,
}: {
  startedAt?: Timestamp;
  meetingMin: number;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const startMs = startedAt.toMillis();
    const tick = () =>
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const elapsedStr =
    mins > 0 ? `${mins} мин ${String(secs).padStart(2, '0')} с` : `${secs} с`;

  const low = Math.max(1, Math.round(meetingMin * 0.1));
  const high = Math.max(low + 1, Math.round(meetingMin * 0.3));
  const hint =
    meetingMin > 0
      ? `Транскрибируем запись ~${meetingMin} мин — обычно занимает ${low}–${high} мин`
      : 'Транскрибируем запись — обычно занимает 1–3 мин';

  return (
    <div className="ml-6 space-y-0.5 pl-1">
      <p className="text-xs tabular-nums text-muted-foreground">
        Идёт обработка: {elapsedStr}
      </p>
      <p className="text-xs text-muted-foreground/80">{hint}</p>
    </div>
  );
}

function StatusRow({
  done,
  loading,
  failed,
  label,
}: {
  done: boolean;
  loading?: boolean;
  failed?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {failed ? (
        <Circle className="h-4 w-4 fill-destructive/20 text-destructive" />
      ) : done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/40" />
      )}
      <span
        className={cn(
          failed
            ? 'text-destructive'
            : done
            ? 'text-foreground'
            : loading
            ? 'text-foreground'
            : 'text-muted-foreground/60',
        )}
      >
        {label}
      </span>
    </div>
  );
}
