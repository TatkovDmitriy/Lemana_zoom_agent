import type { MeetingInput } from '@lemana/shared';

export function buildSummaryPrompt(input: MeetingInput): string {
  const participantList =
    input.participants.length > 0 ? input.participants.join(', ') : 'не указаны';

  return `Ты — аналитик встреч. Проанализируй транскрипт и верни JSON строго по схеме.

## Метаданные встречи
- Тема: ${input.topic}
- Участники: ${participantList}
- Длительность: ${input.durationMin} мин
- Дата: ${input.startedAt}

## Транскрипт
<transcript>
${input.transcript}
</transcript>

## Инструкция
Верни ТОЛЬКО валидный JSON (без markdown-блоков, без пояснений) следующей структуры:

{
  "title": "краткое название встречи (до 80 символов, по-русски если встреча на русском)",
  "meetingType": "sync" | "stakeholder" | "dryrun" | "review" | "external",
  "summary": "резюме встречи в 3-5 предложениях",
  "decisions": ["принятое решение 1", "принятое решение 2"],
  "actionItems": [
    { "text": "что сделать", "owner": "Имя Фамилия или null", "due": "YYYY-MM-DD или null" }
  ],
  "openQuestions": ["вопрос без ответа 1"],
  "nextSteps": ["следующий шаг 1"]
}

Правила:
- meetingType определяй по контексту: sync=рабочий синк, stakeholder=с руководством, dryrun=репетиция, review=ревью, external=с внешними
- decisions — только чёткие принятые решения, не рассуждения
- actionItems — конкретные задачи с ответственным лицом (если упомянуто) и дедлайном (если упомянут)
- openQuestions — вопросы, оставшиеся без ответа
- Поля owner и due в actionItems — null если не упомянуты явно
- Ответ строго на языке транскрипта (русский → русский, английский → английский)`;
}
