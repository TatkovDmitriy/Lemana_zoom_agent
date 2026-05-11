'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

type Project = {
  id: string;
  name: string;
  description?: string;
  color?: string | null;
  updatedAt?: unknown;
};

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Индиго' },
  { value: '#22c55e', label: 'Зелёный' },
  { value: '#f59e0b', label: 'Янтарный' },
  { value: '#ef4444', label: 'Красный' },
  { value: '#3b82f6', label: 'Синий' },
  { value: '#8b5cf6', label: 'Фиолетовый' },
];

export default function ProjectsPage() {
  const auth = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: COLOR_OPTIONS[0]!.value,
  });

  useEffect(() => {
    if (auth.status === 'unauthenticated') router.replace('/sign-in');
  }, [auth.status, router]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    fetch('/api/projects', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => toast.error('Не удалось загрузить проекты'));
  }, [auth]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (auth.status !== 'authenticated') return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          color: form.color,
        }),
      });
      if (!res.ok) throw new Error();
      const created: Project = await res.json();
      setProjects((prev) => (prev ? [created, ...prev] : [created]));
      setDialogOpen(false);
      setForm({ name: '', description: '', color: COLOR_OPTIONS[0]!.value });
      toast.success(`Проект «${created.name}» создан`);
    } catch {
      toast.error('Не удалось создать проект');
    } finally {
      setCreating(false);
    }
  }

  if (auth.status === 'loading' || projects === null) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
          {projects.length > 0 && (
            <Badge variant="count">{projects.length}</Badge>
          )}
        </div>
        {projects.length > 0 && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Новый проект
          </Button>
        )}
      </header>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Нет проектов</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Создайте первый проект, чтобы организовать минутки встреч по темам
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать проект
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="group relative overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: p.color ?? 'hsl(var(--border))' }}
              />
              <div className="space-y-3 p-5 pl-6">
                <div className="space-y-1">
                  <h3 className="text-[15px] font-semibold leading-snug tracking-tight">
                    {p.name}
                  </h3>
                  {p.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60">
                      Без описания
                    </p>
                  )}
                </div>
                {p.updatedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Обновлён {formatDate(p.updatedAt)}
                  </p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="relative">
          <DialogClose onClose={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Новый проект</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Название</label>
              <Input
                required
                placeholder="Например: Разработка продукта"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Описание <span className="text-muted-foreground">(необязательно)</span>
              </label>
              <Input
                placeholder="Краткий контекст проекта"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Цвет</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    className="relative h-7 w-7 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: c.value }}
                    onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  >
                    {form.color === c.value && (
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full ring-2 ring-foreground/40 ring-offset-2 ring-offset-background"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={creating || !form.name.trim()}>
                {creating ? 'Создаём…' : 'Создать'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
