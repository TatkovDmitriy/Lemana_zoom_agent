'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Users, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
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
      fetch(`/api/minutes?projectId=${projectId}&limit=20`, { headers }).then((r) => r.json()),
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
      <div className="p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {project.color && (
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
        )}
        <h1 className="text-2xl font-semibold">{project.name}</h1>
      </div>

      {minutes.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-sm text-muted-foreground">Встреч в этом проекте пока нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {minutes.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/minutes/${m.id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={m.meetingType as MeetingType}>
                      {MEETING_TYPE_LABELS[m.meetingType]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                  </div>
                  <p className="font-medium truncate">{m.title}</p>
                  {m.summary && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{m.summary}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
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
                  <ChevronRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          ))}
          {nextCursor && (
            <div className="pt-2 text-center">
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
