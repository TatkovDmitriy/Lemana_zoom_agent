# Lemana Zoom Agent — Product Backlog

_Last updated: 2026-05-11 | PM: Claude_

## Legend

| Field | Values |
|---|---|
| Priority | P0 (must have MVP) / P1 (important) / P2 (nice to have) |
| Status | TODO / IN PROGRESS / IN REVIEW / DONE / BLOCKED |
| Component | web / watcher / bot / shared / infra |

---

## Active Sprint — Phase 1: Core

| ID | Priority | Component | Status | Title |
|---|---|---|---|---|
| LZA-001 | P0 | infra | TODO | Monorepo scaffold — базовая структура проекта |
| LZA-002 | P0 | shared | TODO | Shared types & Zod schemas (Meeting, MeetingMinutes, Project) |
| LZA-003 | P0 | watcher | TODO | Zoom OAuth + Server-to-Server App setup |
| LZA-004 | P0 | watcher | TODO | Webhook endpoint — обработка recording.completed |
| LZA-005 | P0 | watcher | TODO | Zoom transcript download через API |
| LZA-006 | P0 | watcher | TODO | Claude API summarizer — генерация минуток из транскрипта |
| LZA-007 | P0 | watcher | TODO | Firebase write — сохранение минутки в Firestore |
| LZA-008 | P0 | bot | TODO | Telegram bot — /start, базовая команда, push уведомление |
| LZA-009 | P0 | web | TODO | Next.js app init — Firebase Auth (Google SSO) |
| LZA-010 | P0 | web | TODO | Страница Projects — список проектов из Firestore |
| LZA-011 | P0 | web | TODO | Страница Minutes — список минуток проекта |
| LZA-012 | P0 | web | TODO | Страница MeetingDetail — полная минутка |

---

## Backlog — Phase 2: Improvements

| ID | Priority | Component | Status | Title |
|---|---|---|---|---|
| LZA-020 | P1 | web | TODO | Поиск по минуткам (full-text, Firestore) |
| LZA-021 | P1 | web | TODO | Редактирование минутки |
| LZA-022 | P1 | web | TODO | Теги и фильтрация |
| LZA-023 | P1 | shared | TODO | Obsidian sync — push минутки в GitHub repo |
| LZA-024 | P2 | watcher | TODO | Автоджойн через Zoom MCP (исследование feasibility) |

---

## Backlog — Phase 3: Autonomy

| ID | Priority | Component | Status | Title |
|---|---|---|---|---|
| LZA-030 | P1 | infra | TODO | Worker monitoring — uptime alerts |
| LZA-031 | P2 | web | TODO | Мультипользовательский режим |
| LZA-032 | P2 | watcher | TODO | Интеграция с Google Calendar |

---

## DONE

_Пусто — проект только стартовал_

---

## BLOCKED

_Нет заблокированных задач_

---

## Notes

- LZA-001 — стартовая задача для Engineer, разблокирует всё остальное
- LZA-003 требует создания Zoom Server-to-Server OAuth App в Zoom Marketplace
- LZA-008 требует создания бота через @BotFather и получения TELEGRAM_BOT_TOKEN
