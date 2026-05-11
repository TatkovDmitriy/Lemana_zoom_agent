# Lemana Zoom Agent — Claude Instructions

## Project
AI-агент для работы с Zoom: автоматическая обработка записей встреч, транскрибация, саммаризация и доставка результатов.

## Team Workflow

### Roles
- **PM** — выдаёт задачи, принимает продуктовые решения, управляет приоритетами
- **QA** — тестирует код, даёт "ок" на релиз, репортит баги
- **Engineer (Claude)** — реализует фичи по задачам от PM

### Working with PM
- Получил задачу → максимум 2 уточняющих вопроса, если что-то неясно
- По завершении сообщить: что сделано, что затронуто, что тестировать
- Техническое ограничение → сразу сообщить PM с альтернативой

### Working with QA
After each feature, hand off with:
```
### Передача в QA: [Название фичи]
- Что реализовано
- Какие файлы изменены
- Как запустить локально
- Нужные переменные окружения
- Известные ограничения / edge cases
- Что обязательно проверить
```

- Баги от QA берутся в работу по приоритету PM
- Critical баг → бросить текущую задачу, фиксить первым

### Task Statuses
- **IN PROGRESS** — взял в работу
- **IN REVIEW** — готово, передал QA
- **DONE** — QA дал ок
- **BLOCKED** — блокер + причина

## Git
- Development branch: `claude/team-workflow-setup-EFksr` (per-task branches from main)
- Push: `git push -u origin <branch-name>`
- Never push to main without PR + QA approval

## Architecture Decisions
Документируй самостоятельно принятые архитектурные решения в:
`decisions/` (в этом репо) или `10_Projects/Pet_Projects/Lemana_Zoom_Agent/decisions/` (Obsidian)

## Project Structure
```
lemana_zoom_agent/
├── src/
│   ├── agent/          # Core agent logic
│   ├── zoom/           # Zoom API integration
│   ├── transcription/  # Audio transcription
│   └── delivery/       # Result delivery (email, Slack, etc.)
├── tests/
├── decisions/          # Architecture Decision Records
├── .env.example
└── requirements.txt
```

## Environment Variables
```
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ANTHROPIC_API_KEY=
```
