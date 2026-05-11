import type { MinuteOutput, MeetingInput } from './types.js';

export function renderMinuteMarkdown(
  output: MinuteOutput,
  input: Pick<MeetingInput, 'startedAt' | 'durationMin' | 'participants'>,
  catalogUrl?: string,
): string {
  const date = new Date(input.startedAt);
  const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const lines: string[] = [];

  lines.push(`# ${meetingTypeLabel(output.meetingType)}: ${output.title}`);
  lines.push('');
  lines.push(`> **Дата:** ${dateStr} | **Время:** ${timeStr} | **Длительность:** ${input.durationMin} мин`);
  if (catalogUrl) {
    lines.push(`> [Открыть в каталоге](${catalogUrl})`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Участники');
  lines.push('');
  lines.push('| Имя | Роль |');
  lines.push('|-----|------|');
  for (const p of input.participants) {
    lines.push(`| ${p} | — |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Резюме');
  lines.push('');
  lines.push(output.summary);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## ✅ Принятые решения');
  lines.push('');
  if (output.decisions.length === 0) {
    lines.push('*Решений не зафиксировано.*');
  } else {
    lines.push('| # | Решение |');
    lines.push('|---|---------|');
    output.decisions.forEach((d, i) => lines.push(`| ${i + 1} | ${d} |`));
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 📌 Action Items');
  lines.push('');
  if (output.actionItems.length === 0) {
    lines.push('*Action items не зафиксированы.*');
  } else {
    lines.push('| # | Задача | Ответственный | Дедлайн |');
    lines.push('|---|--------|---------------|---------|');
    output.actionItems.forEach((a, i) =>
      lines.push(`| ${i + 1} | ${a.text} | ${a.owner ?? '—'} | ${a.due ?? '—'} |`),
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## ❓ Открытые вопросы (Parking Lot)');
  lines.push('');
  if (output.openQuestions.length === 0) {
    lines.push('*Открытых вопросов нет.*');
  } else {
    for (const q of output.openQuestions) {
      lines.push(`- [ ] ${q}`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Следующие шаги');
  lines.push('');
  if (output.nextSteps.length === 0) {
    lines.push('*Не зафиксированы.*');
  } else {
    for (const s of output.nextSteps) {
      lines.push(`- ${s}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

export function renderTelegramMessage(
  output: MinuteOutput,
  input: Pick<MeetingInput, 'startedAt' | 'durationMin' | 'participants'>,
): string {
  const date = new Date(input.startedAt);
  const dateStr = date.toLocaleDateString('ru-RU');
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const lines: string[] = [];
  lines.push(`📋 *${escapeMarkdown(output.title)}*`);
  lines.push(`🗓 ${escapeMarkdown(dateStr)} ${escapeMarkdown(timeStr)} · ${input.durationMin} мин`);
  lines.push(`👥 ${input.participants.map(escapeMarkdown).join(', ')}`);
  lines.push('');
  lines.push(escapeMarkdown(output.summary));

  if (output.decisions.length > 0) {
    lines.push('');
    lines.push('✅ *Решения:*');
    output.decisions.slice(0, 3).forEach((d) => lines.push(`• ${escapeMarkdown(d)}`));
    if (output.decisions.length > 3) lines.push(`_...и ещё ${output.decisions.length - 3}_`);
  }

  if (output.actionItems.length > 0) {
    lines.push('');
    lines.push('📌 *Action Items:*');
    output.actionItems.slice(0, 3).forEach((a) => {
      const owner = a.owner ? ` — ${escapeMarkdown(a.owner)}` : '';
      lines.push(`• ${escapeMarkdown(a.text)}${owner}`);
    });
    if (output.actionItems.length > 3) lines.push(`_...и ещё ${output.actionItems.length - 3}_`);
  }

  return lines.join('\n');
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

function meetingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sync: 'Sync',
    stakeholder: 'Stakeholder Sync',
    dryrun: 'Dry Run',
    review: 'Review',
    external: 'External Meeting',
  };
  return labels[type] ?? 'Встреча';
}

export function buildObsidianFrontmatter(params: {
  output: MinuteOutput;
  input: MeetingInput;
  minuteId: string;
  projectId: string | null;
  catalogUrl: string;
  zoomMeetingId?: string;
  zoomRecordingUrl?: string;
}): string {
  const { output, input, minuteId, projectId, catalogUrl, zoomMeetingId, zoomRecordingUrl } =
    params;
  const date = new Date(input.startedAt);
  const dateStr = date.toISOString().slice(0, 10);
  const timeStr = date.toTimeString().slice(0, 5);

  const participantsList = input.participants.map((p) => `  - ${p}`).join('\n');
  const tags = ['meeting', 'zoom', `meeting/${output.meetingType}`, 'action/open'];

  return `---
type: meeting
meeting_type: ${output.meetingType}
source: zoom
date: ${dateStr}
time: "${timeStr}"
duration_min: ${input.durationMin}
participants:
${participantsList}
topic: "${input.topic.replace(/"/g, '\\"')}"
${zoomMeetingId ? `zoom_meeting_id: "${zoomMeetingId}"` : ''}
${zoomRecordingUrl ? `zoom_recording_url: ${zoomRecordingUrl}` : ''}
catalog_url: ${catalogUrl}
catalog_project_id: ${projectId}
catalog_minute_id: ${minuteId}
tags: [${tags.join(', ')}]
created: ${date.toISOString()}
---

`;
}

export function buildObsidianFileName(
  startedAt: string,
  meetingType: string,
  topic: string,
): string {
  const date = new Date(startedAt).toISOString().slice(0, 10);
  const slug = topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  const type = meetingType.charAt(0).toUpperCase() + meetingType.slice(1);
  return `${date}_${type}_${slug}.md`;
}

export function buildSearchTokens(
  title: string,
  participants: string[],
  topic: string,
  summary: string,
): string[] {
  const text = [title, ...participants, topic, summary].join(' ');
  return [...new Set(
    text
      .toLowerCase()
      .split(/[\s,;:.!?()[\]{}/\\]+/)
      .filter((t) => t.length > 2),
  )];
}
