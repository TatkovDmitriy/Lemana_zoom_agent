import { describe, it, expect } from 'vitest';
import {
  buildObsidianFileName,
  buildSearchTokens,
  renderTelegramMessage,
} from './markdown.js';
import type { MeetingInput, MinuteOutput } from './types.js';

const input: MeetingInput = {
  meetingId: 'test-123',
  topic: 'Q2 Planning Sync',
  startedAt: '2026-05-11T10:00:00.000Z',
  durationMin: 45,
  participants: ['Иван Иванов', 'Мария Петрова'],
  transcript: 'transcript text',
  ownerId: 'user-1',
};

const output: MinuteOutput = {
  title: 'Q2 Planning Sync',
  meetingType: 'sync',
  summary: 'Обсудили цели на Q2.',
  decisions: ['Запустить фичу X до 1 июня', 'Провести ревью архитектуры'],
  actionItems: [
    { text: 'Написать спеку', owner: 'Иван Иванов', due: '2026-05-15' },
  ],
  openQuestions: ['Какой будет бюджет на инфраструктуру?'],
  nextSteps: ['Следующий sync 18 мая'],
  markdown: '',
};

describe('buildObsidianFileName', () => {
  it('generates a valid filename', () => {
    const name = buildObsidianFileName(input.startedAt, 'sync', input.topic);
    expect(name).toBe('2026-05-11_Sync_q2_planning_sync.md');
  });
});

describe('buildSearchTokens', () => {
  it('returns lowercase tokens longer than 2 chars', () => {
    const tokens = buildSearchTokens('Q2 Planning', ['Иван'], 'sync', 'test');
    expect(tokens).toContain('planning');
    expect(tokens).toContain('иван');
    expect(tokens.every((t) => t.length > 2)).toBe(true);
  });

  it('deduplicates tokens', () => {
    const tokens = buildSearchTokens('test', ['test'], 'test', 'test');
    const count = tokens.filter((t) => t === 'test').length;
    expect(count).toBe(1);
  });
});

describe('renderTelegramMessage', () => {
  it('includes title and summary', () => {
    const msg = renderTelegramMessage(output, input);
    expect(msg).toContain('Q2 Planning Sync');
    expect(msg).toContain('Обсудили цели на Q2');
  });
});
