import type { MeetingInput } from '@lemana/shared';

export const MOCK_MEETING: MeetingInput = {
  meetingId: 'mock-meeting-001',
  topic: 'Q2 Planning Sync',
  startedAt: new Date().toISOString(),
  durationMin: 47,
  participants: ['Дмитрий Татьков', 'Мария Петрова', 'Александр Козлов'],
  transcript: `
Дмитрий: Добрый день, коллеги. Начнём с планов на Q2. Основная задача — запуск Zoom Agent до конца мая.
Мария: Я готова взять на себя тестирование webhook интеграции. Думаю, нам нужна неделя.
Александр: По backend — Firebase и Railway уже настроены, осталось подключить реальный Zoom MCP. Планирую закончить к 15 мая.
Дмитрий: Отлично. Тогда решаем: дедлайн MVP — 20 мая. Телеграм-бот и Obsidian-синк в первом релизе.
Мария: Есть вопрос по безопасности токенов Zoom — нужно уточнить с командой безопасности, можем ли мы хранить refresh-токены в Firestore даже зашифрованными.
Александр: Запишем как открытый вопрос. Следующий синк — 14 мая, обсудим статус по Zoom MCP.
Дмитрий: Договорились. Все, встреча закончена.
  `,
  ownerId: 'mock-service-user',
  recordingUrl: 'https://zoom.us/rec/mock-recording',
};

export function createMockJobPayload() {
  return {
    type: 'process_recording' as const,
    status: 'pending' as const,
    payload: {
      meetingId: MOCK_MEETING.meetingId,
      topic: MOCK_MEETING.topic,
      startedAt: MOCK_MEETING.startedAt,
      durationMin: MOCK_MEETING.durationMin,
      participants: MOCK_MEETING.participants,
      transcript: MOCK_MEETING.transcript,
      recordingUrl: MOCK_MEETING.recordingUrl,
      ownerId: MOCK_MEETING.ownerId,
    },
    attempts: 0,
  };
}
