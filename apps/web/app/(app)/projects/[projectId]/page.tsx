'use client';

import { useEffect, useState, use } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Clock, Users, Calendar, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { MeetingType } from '@lemana/shared';

type Minute = {
  id: string;
  title: string;
  date: unknown;
  durationMin: number;
  participants: string[];
  meetingType: MeetingType;
  summary: string;
};

type Project = { id: string; name: string; color?: string | null };

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  sync: 'Синк',
  stakeholder: 'Стейкхолдер',
  dryrun: 'Драйран',
  review: 'Ревью',
  external: 'Внешняя',
};

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const auth = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [minutes, setMinutes] = useState<Minute[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (auth.status === 'unauthenticated') router.replace('/sign-in');
  }, [auth.status, router]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    const headers = { Authorization: `Bearer ${auth.token}` };

    Promise.all([
      fetch(`/api/projects/${projectId}`, { headers }).then((r) => r.json()),
      fetch(`/api/minutes?projectId=${projectId}&limit=20`, { headers }).then((r) =>
        r.json(),
      ),
    ])
      .then(([proj, data]) => {
        setProject(proj);
        setMinutes(data.minutes ?? []);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch(() => toast.error('Не удалось загрузить проект'));
  }, [auth, projectId]);

  async function loadMore() {
    if (auth.status !== 'authenticated' || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/minutes?projectId=${projectId}&limit=20&cursor=${nextCursor}`,
        { headers: { Authorization: `Bearer ${auth.token}` } },
      );
      const data = await res.json();
      setMinutes((prev) => [...(prev ?? []), ...(data.minutes ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoadingMore(false);
    }
  }

  if (auth.status === 'loading' || !project || minutes === null) {
    return (
      <div>
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="mb-8 h-8 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
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
        <span className="text-foreground">{project.name}</span>
      </nav>

      <header className="mb-8 flex items-center gap-3">
        {project.color && (
          <span
            className="h-3 w-3 rounded-full ring-2 ring-offset-2 ring-offset-background"
            style={{
              backgroundColor: project.color,
              ['--tw-ring-color' as string]: project.color,
            }}
          />
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {minutes.length > 0 && <Badge variant="count">{minutes.length}</Badge>}
      </header>

      {minutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Встреч пока нет</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Минутки появятся автоматически после записи в Zoom
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {minutes.map((m) => (
            <button
              key={m.id}
              onClick={() => router.push(`/minutes/${m.id}`)}
              className="group flex w-full items-start gap-4 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={m.meetingType as MeetingType}>
                    {MEETING_TYPE_LABELS[m.meetingType]}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(m.date)}
                  </span>
                </div>
                <p className="text-[15px] font-medium leading-snug truncate">
                  {m.title}
                </p>
                {m.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {m.summary}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-4 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {m.durationMin} мин
                </span>
                {m.participants.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {m.participants.length}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
          {nextCursor && (
            <div className="pt-3 text-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Загружаем…' : 'Показать ещё'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
