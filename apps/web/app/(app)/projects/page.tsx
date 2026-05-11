'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Project = {
  id: string;
  name: string;
  description?: string;
  color?: string | null;
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
  const [form, setForm] = useState({ name: '', description: '', color: COLOR_OPTIONS[0]!.value });

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
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description || undefined, color: form.color }),
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
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Проекты</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Новый проект
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="mb-2 text-lg font-medium">Нет проектов</h2>
          <p className="mb-6 text-sm text-muted-foreground">Создайте первый проект для организации минуток встреч</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать проект
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              style={p.color ? { borderLeftColor: p.color, borderLeftWidth: 4 } : undefined}
              onClick={() => router.push(`/projects/${p.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
                {p.description && <CardDescription>{p.description}</CardDescription>}
              </CardHeader>
            </Card>
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
              <label className="mb-1.5 block text-sm font-medium">Название *</label>
              <Input
                required
                placeholder="Например: Разработка продукта"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Описание</label>
              <Input
                placeholder="Необязательно"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
                    className="h-6 w-6 rounded-full ring-offset-2 transition-all"
                    style={{
                      backgroundColor: c.value,
                      outline: form.color === c.value ? `2px solid ${c.value}` : 'none',
                    }}
                    onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
