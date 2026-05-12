'use client';

import { useEffect, useState, use, useRef } from 'react';
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
  Pencil,
  Plus,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, cn } from '@/lib/utils';
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
  projectId: string | null;
};

type EditablePatch = Partial<
  Pick<Minute, 'summary' | 'decisions' | 'actionItems' | 'openQuestions' | 'nextSteps'>
>;

type Project = { id: string; name: string };

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  sync: 'Синк',
  stakeholder: 'Стейкхолдер',
  dryrun: 'Драйран',
  review: 'Ревью',
  external: 'Внешняя',
};

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

  async function savePatch(patch: EditablePatch): Promise<void> {
    if (auth.status !== 'authenticated' || !minute) {
      throw new Error('Not authenticated');
    }
    // Snapshot current state for rollback on error.
    const snapshot = minute;
    // Optimistic update — UI flips immediately.
    setMinute({ ...minute, ...patch });
    try {
      const res = await fetch(`/api/minutes/${minuteId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      // Rollback + propagate so the editable section can stay in edit mode.
      setMinute(snapshot);
      toast.error('Не удалось сохранить — изменения отменены');
      throw err;
    }
  }

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
              href={`/projects/${minute.projectId}` as never}
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
        <EditableSummary
          value={minute.summary}
          onSave={(v) => savePatch({ summary: v })}
        />

        <EditableStringList
          title="Решения"
          icon={CheckSquare}
          values={minute.decisions}
          onSave={(v) => savePatch({ decisions: v })}
        />

        <EditableActionItems
          values={minute.actionItems}
          onSave={(v) => savePatch({ actionItems: v })}
        />

        <EditableStringList
          title="Открытые вопросы"
          icon={HelpCircle}
          values={minute.openQuestions}
          onSave={(v) => savePatch({ openQuestions: v })}
          numbered
        />

        <EditableStringList
          title="Следующие шаги"
          icon={ChevronRight}
          values={minute.nextSteps}
          onSave={(v) => savePatch({ nextSteps: v })}
          numbered
        />
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  editing,
  onEdit,
}: {
  icon: React.ElementType;
  title: string;
  editing: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h2>
      {!editing && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Редактировать «${title}»`}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function EditActions({
  onSave,
  onCancel,
  saving,
  dirty,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  return (
    <div className="mt-3 flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
        Отменить
      </Button>
      <Button type="button" size="sm" onClick={onSave} disabled={saving || !dirty}>
        {saving ? 'Сохраняем…' : 'Сохранить'}
      </Button>
    </div>
  );
}

// ── Summary ────────────────────────────────────────────────────────────

function EditableSummary({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function start() {
    setDraft(value);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setDraft(value);
  }
  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      // toast handled upstream; stay in edit mode so user can retry.
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="group rounded-lg border border-border bg-muted/40 p-5">
      <SectionHeader icon={Sparkles} title="Резюме" editing={editing} onEdit={start} />
      {editing ? (
        <div onKeyDown={(e) => e.key === 'Escape' && cancel()}>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            autoFocus
            placeholder="Краткое описание встречи"
          />
          <EditActions
            onSave={commit}
            onCancel={cancel}
            saving={saving}
            dirty={draft.trim() !== value && draft.trim().length > 0}
          />
        </div>
      ) : (
        <p
          onClick={start}
          className="cursor-text text-sm leading-relaxed text-foreground/90"
        >
          {value || (
            <span className="italic text-muted-foreground">Нажмите, чтобы добавить резюме</span>
          )}
        </p>
      )}
    </section>
  );
}

// ── String list (decisions, openQuestions, nextSteps) ─────────────────

function EditableStringList({
  title,
  icon: Icon,
  values,
  onSave,
  numbered = false,
}: {
  title: string;
  icon: React.ElementType;
  values: string[];
  onSave: (next: string[]) => Promise<void>;
  numbered?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(values);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function start() {
    setDraft(values.length > 0 ? [...values] : ['']);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setDraft(values);
  }
  async function commit() {
    const cleaned = draft.map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(cleaned) === JSON.stringify(values)) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(cleaned);
      setEditing(false);
    } catch {
      // stay in edit mode
    } finally {
      setSaving(false);
    }
  }

  const cleanedDraft = draft.map((s) => s.trim()).filter(Boolean);
  const dirty = JSON.stringify(cleanedDraft) !== JSON.stringify(values);

  return (
    <section className="group rounded-lg border border-border bg-card p-5">
      <SectionHeader icon={Icon} title={title} editing={editing} onEdit={start} />
      {editing ? (
        <div
          ref={containerRef}
          onKeyDown={(e) => {
            // Escape from any input cancels. Avoid hijacking Escape inside
            // dropdowns; only catch when we own the active element.
            if (
              e.key === 'Escape' &&
              containerRef.current?.contains(document.activeElement)
            ) {
              cancel();
            }
          }}
        >
          <ul className="space-y-2">
            {draft.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const next = [...draft];
                    next[i] = e.target.value;
                    setDraft(next);
                  }}
                  placeholder="Введите текст…"
                  autoFocus={i === draft.length - 1 && item === ''}
                />
                <button
                  type="button"
                  onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                  aria-label="Удалить"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setDraft([...draft, ''])}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Добавить
          </button>
          <EditActions onSave={commit} onCancel={cancel} saving={saving} dirty={dirty} />
        </div>
      ) : values.length > 0 ? (
        <ul onClick={start} className="cursor-text space-y-2">
          {values.map((d, i) => (
            <li
              key={i}
              className={cn(
                'flex gap-2.5 text-sm leading-relaxed',
                numbered ? 'text-foreground/90' : '',
              )}
            >
              {numbered ? (
                <span className="text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
              ) : (
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
              )}
              <span>{d}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          onClick={start}
          className="cursor-text text-sm italic text-muted-foreground/60"
        >
          Нажмите, чтобы добавить
        </p>
      )}
    </section>
  );
}

// ── Action items ──────────────────────────────────────────────────────

function EditableActionItems({
  values,
  onSave,
}: {
  values: ActionItem[];
  onSave: (next: ActionItem[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ActionItem[]>(values);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function start() {
    setDraft(values.length > 0 ? values.map((v) => ({ ...v })) : [{ text: '' }]);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setDraft(values);
  }
  function normalize(items: ActionItem[]): ActionItem[] {
    return items
      .map((a) => ({
        text: a.text.trim(),
        owner: a.owner?.trim() || undefined,
        due: a.due?.trim() || undefined,
      }))
      .filter((a) => a.text.length > 0);
  }
  async function commit() {
    const cleaned = normalize(draft);
    if (JSON.stringify(cleaned) === JSON.stringify(values)) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(cleaned);
      setEditing(false);
    } catch {
      // stay in edit mode
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify(normalize(draft)) !== JSON.stringify(values);

  return (
    <section className="group rounded-lg border border-border bg-card p-5">
      <SectionHeader icon={ListChecks} title="Задачи" editing={editing} onEdit={start} />
      {editing ? (
        <div
          ref={containerRef}
          onKeyDown={(e) => {
            if (
              e.key === 'Escape' &&
              containerRef.current?.contains(document.activeElement)
            ) {
              cancel();
            }
          }}
        >
          <ul className="space-y-3">
            {draft.map((item, i) => (
              <li
                key={i}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start gap-2">
                  <Input
                    value={item.text}
                    onChange={(e) => {
                      const next = [...draft];
                      next[i] = { ...next[i]!, text: e.target.value };
                      setDraft(next);
                    }}
                    placeholder="Что нужно сделать…"
                    autoFocus={i === draft.length - 1 && item.text === ''}
                  />
                  <button
                    type="button"
                    onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                    aria-label="Удалить задачу"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    value={item.owner ?? ''}
                    onChange={(e) => {
                      const next = [...draft];
                      next[i] = { ...next[i]!, owner: e.target.value };
                      setDraft(next);
                    }}
                    placeholder="Ответственный (необяз.)"
                  />
                  <Input
                    value={item.due ?? ''}
                    onChange={(e) => {
                      const next = [...draft];
                      next[i] = { ...next[i]!, due: e.target.value };
                      setDraft(next);
                    }}
                    placeholder="Срок (необяз., например 2025-06-01)"
                  />
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setDraft([...draft, { text: '' }])}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Добавить
          </button>
          <EditActions onSave={commit} onCancel={cancel} saving={saving} dirty={dirty} />
        </div>
      ) : values.length > 0 ? (
        <ul onClick={start} className="cursor-text space-y-2">
          {values.map((a, i) => (
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
      ) : (
        <p
          onClick={start}
          className="cursor-text text-sm italic text-muted-foreground/60"
        >
          Нажмите, чтобы добавить задачу
        </p>
      )}
    </section>
  );
}
