'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Users, Calendar, ExternalLink, CheckSquare, HelpCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import type { MeetingType } from '@lemana/shared';

type ActionItem = { text: string; owner?: string; due?: string };

type Minute = {
  id: string;
  title: string;
  date: unknown;
  durationMin: number;
  participants: string[];
  meetingType: MeetingType;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
  nextSteps: string[];
  obsidianPath?: string | null;
  projectId: string;
};

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  sync: 'Синк',
  stakeholder: 'Стейкхолдер',
  dryrun: 'Драйран',
  review: 'Ревью',
  external: 'Внешняя',
};

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function MinutePage({ params }: { params: Promise<{ minuteId: string }> }) {
  const { minuteId } = use(params);
  const auth = useAuth();
  const router = useRouter();
  const [minute, setMinute] = useState<Minute | null>(null);

  useEffect(() => {
    if (auth.status === 'unauthenticated') router.replace('/sign-in');
  }, [auth.status, router]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    fetch(`/api/minutes/${minuteId}`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setMinute)
      .catch(() => toast.error('Не удалось загрузить минутку'));
  }, [auth, minuteId]);

  if (auth.status === 'loading' || !minute) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="mb-2 h-4 w-48" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${minute.projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Назад к проекту</span>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant={minute.meetingType}>{MEETING_TYPE_LABELS[minute.meetingType]}</Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(minute.date)}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {minute.durationMin} мин
          </span>
          {minute.participants.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {minute.participants.join(', ')}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{minute.title}</h1>
        {minute.obsidianPath && (
          <a
            href={`obsidian://open?vault=&file=${encodeURIComponent(minute.obsidianPath)}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            Открыть в Obsidian
          </a>
        )}
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border bg-muted/30 p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Резюме</h2>
          <p className="text-sm leading-relaxed">{minute.summary}</p>
        </section>

        {minute.decisions.length > 0 && (
          <Section title="Решения" icon={CheckSquare}>
            <ul className="space-y-1.5">
              {minute.decisions.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  {d}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {minute.actionItems.length > 0 && (
          <Section title="Задачи" icon={ArrowRight}>
            <ul className="space-y-2">
              {minute.actionItems.map((a, i) => (
                <li key={i} className="rounded-md border p-3 text-sm">
                  <p>{a.text}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    {a.owner && <span>👤 {a.owner}</span>}
                    {a.due && <span>📅 {a.due}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {minute.openQuestions.length > 0 && (
          <Section title="Открытые вопросы" icon={HelpCircle}>
            <ul className="space-y-1.5">
              {minute.openQuestions.map((q, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {i + 1}. {q}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {minute.nextSteps.length > 0 && (
          <Section title="Следующие шаги" icon={ArrowRight}>
            <ul className="space-y-1.5">
              {minute.nextSteps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
