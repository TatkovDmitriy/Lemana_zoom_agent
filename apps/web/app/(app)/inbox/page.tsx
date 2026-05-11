'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronRight, Clock, Inbox, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
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

export default function InboxPage() {
  const auth = useAuth();
  const router = useRouter();
  const [minutes, setMinutes] = useState<Minute[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [projects, setProjects] = useState<Project[] | null>(null);

  // Assign dialog state
  const [assignTarget, setAssignTarget] = useState<Minute | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (auth.status === 'unauthenticated') router.replace('/sign-in');
  }, [auth.status, router]);

  const fetchInbox = useCallback(
    (token: string) => {
      fetch('/api/minutes?projectId=null&limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setMinutes(data.minutes ?? []);
          setNextCursor(data.nextCursor ?? null);
        })
        .catch(() => toast.error('Не удалось загрузить входящие'));
    },
    [],
  );

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    fetchInbox(auth.token);
    fetch('/api/projects', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, [auth, fetchInbox]);

  async function loadMore() {
    if (auth.status !== 'authenticated' || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/minutes?projectId=null&limit=20&cursor=${nextCursor}`,
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

  async function handleAssign(projectId: string) {
    if (!assignTarget || auth.status !== 'authenticated') return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/minutes/${assignTarget.id}/move`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error();
      setMinutes((prev) => prev?.filter((m) => m.id !== assignTarget.id) ?? null);
      const project = projects?.find((p) => p.id === projectId);
      toast.success(
        `Минутка перенесена в проект «${project?.name ?? projectId}»`,
      );
      setAssignTarget(null);
    } catch {
      toast.error('Не удалось переместить минутку');
    } finally {
      setAssigning(false);
    }
  }

  if (auth.status === 'loading' || minutes === null) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-36" />
        </div>
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
      <header className="mb-8 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Входящие</h1>
        {minutes.length > 0 && (
          <Badge variant="count">{minutes.length}</Badge>
        )}
      </header>

      {minutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Входящие пусты</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Новые минутки от Zoom появятся здесь до назначения в проект
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {minutes.map((m) => (
            <div
              key={m.id}
              className="flex w-full items-start gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div
                className="flex-1 min-w-0 space-y-1 cursor-pointer"
                onClick={() => router.push(`/minutes/${m.id}`)}
              >
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
              <div className="flex shrink-0 items-center gap-3 pt-1">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAssignTarget(m)}
                >
                  Назначить проект
                </Button>
              </div>
            </div>
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

      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent className="relative max-w-sm">
          <DialogClose onClose={() => setAssignTarget(null)} />
          <DialogHeader>
            <DialogTitle>Назначить проект</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
            {assignTarget?.title}
          </p>
          {projects === null ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Нет проектов. Сначала создайте проект.
            </p>
          ) : (
            <ul className="space-y-1.5 py-1">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    className="flex w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-accent disabled:opacity-50"
                    disabled={assigning}
                    onClick={() => handleAssign(p.id)}
                  >
                    {p.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                    )}
                    <span className="flex-1 font-medium">{p.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
