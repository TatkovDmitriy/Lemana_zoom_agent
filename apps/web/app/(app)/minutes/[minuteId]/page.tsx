'use client';

import { useEffect, useState, use } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckSquare,
  ChevronRight,
  Clock,
  ExternalLink,
  HelpCircle,
  ListChecks,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
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

type Project = { id: string; name: string };

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  sync: 'Синк',
  stakeholder: 'Стейкхолдер',
  dryrun: 'Драйран',
  review: 'Ревью',
  external: 'Внешняя',
};

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function MinutePage({
  params,
}: {
  params: Promise<{ minuteId: string }>;
}) {
  const { minuteId } = use(params);
  const auth = useAuth();
  const router = useRouter();
  const [minute, setMinute] = useState<Minute | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (auth.status === 'unauthenticated') router.replace('/sign-in');
  }, [auth.status, router]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    const headers = { Authorization: `Bearer ${auth.token}` };
    fetch(`/api/minutes/${minuteId}`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((m: Minute) => {
        setMinute(m);
        if (m.projectId) {
          return fetch(`/api/projects/${m.projectId}`, { headers })
            .then((r) => (r.ok ? r.json() : null))
            .then(setProject);
        }
        return undefined;
      })
      .catch(() => toast.error('Не удалось загрузить минутку'));
  }, [auth, minuteId]);

  if (auth.status === 'loading' || !minute) {
    return (
      <div>
        <Skeleton className="mb-2 h-4 w-48" />
        <Skeleton className="mb-3 h-9 w-3/4" />
        <Skeleton className="mb-8 h-4 w-1/2" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <NextLink href="/projects" className="hover:text-foreground transition-colors">
          Проекты
        </NextLink>
        <ChevronRight className="h-3 w-3" />
        {project ? (
          <>
            <NextLink
              href={`/projects/${minute.projectId}`}
              className="hover:text-foreground transition-colors"
            >
              {project.name}
            </NextLink>
            <ChevronRight className="h-3 w-3" />
          </>
        ) : null}
        <span className="text-foreground truncate max-w-[200px]">{minute.title}</span>
      </nav>

      <header className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={minute.meetingType}>
            {MEETING_TYPE_LABELS[minute.meetingType]}
          </Badge>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(minute.date)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {minute.durationMin} мин
          </span>
          {minute.participants.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {minute.participants.length} участников
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight leading-tight">
          {minute.title}
        </h1>
        {minute.participants.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {minute.participants.join(', ')}
          </p>
        )}
        {minute.obsidianPath && (
          <a
            href={`obsidian://open?vault=&file=${encodeURIComponent(minute.obsidianPath)}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Открыть в Obsidian
          </a>
        )}
      </header>

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-muted/40 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Резюме
          </h2>
          <p className="text-sm leading-relaxed text-foreground/90">{minute.summary}</p>
        </section>

        {minute.decisions.length > 0 && (
          <Section title="Решения" icon={CheckSquare}>
            <ul className="space-y-2">
              {minute.decisions.map((d, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {minute.actionItems.length > 0 && (
          <Section title="Задачи" icon={ListChecks}>
            <ul className="space-y-2">
              {minute.actionItems.map((a, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border bg-background p-3 text-sm"
                >
                  <p className="leading-snug">{a.text}</p>
                  {(a.owner || a.due) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {a.owner && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {a.owner}
                        </span>
                      )}
                      {a.due && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {a.due}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {minute.openQuestions.length > 0 && (
          <Section title="Открытые вопросы" icon={HelpCircle}>
            <ul className="space-y-2">
              {minute.openQuestions.map((q, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {minute.nextSteps.length > 0 && (
          <Section title="Следующие шаги" icon={ChevronRight}>
            <ul className="space-y-2">
              {minute.nextSteps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
