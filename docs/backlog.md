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
| LZA-015 | P0 | bot | TODO | Deploy apps/bot на Railway |
| LZA-016 | P0 | infra | DONE | Прописать Zoom Webhook URL в Zoom Marketplace |
| LZA-025 | P0 | web | DONE | Качественный UI/UX фронтенд: каталог записей и проекты |
| LZA-027 | P0 | web+watcher | TODO | Inbox: привязка минуток к проектам |

---

## DONE

| ID | Component | Title |
|---|---|---|
| LZA-001 | infra | Monorepo scaffold — базовая структура проекта |
| LZA-002 | shared | Shared types & Zod schemas (Meeting, MeetingMinutes, Project) |
| LZA-003 | watcher | Zoom OAuth + Server-to-Server App setup |
| LZA-004 | watcher | Webhook endpoint — обработка recording.completed |
| LZA-005 | watcher | Zoom transcript download через API |
| LZA-006 | watcher | Claude API summarizer — генерация минуток из транскрипта |
| LZA-007 | watcher | Firebase write — сохранение минутки в Firestore |
| LZA-008 | bot | Telegram bot — /start, базовая команда, push уведомление |
| LZA-009 | web | Next.js app init — Firebase Auth (Google SSO) |
| LZA-010 | web | Страница Projects — список проектов из Firestore |
| LZA-011 | web | Страница Minutes — список минуток проекта |
| LZA-012 | web | Страница MeetingDetail — полная минутка |
| LZA-013 | infra | Railway deploy — watcher сервис |
| LZA-014 | infra | Vercel deploy — web приложение |
| LZA-017 | infra | Firebase Google Auth — включить провайдер + Vercel домен |
| LZA-023 | infra | Obsidian sync — auto-push docs в GitHub repo |

---

## Backlog — Phase 2: Improvements

| ID | Priority | Component | Status | Title |
|---|---|---|---|---|
| LZA-020 | P1 | web | TODO | Поиск по минуткам (full-text, Firestore) |
| LZA-021 | P1 | web | TODO | Редактирование минутки |
| LZA-022 | P1 | web | TODO | Теги и фильтрация |
| LZA-024 | P2 | watcher | TODO | Автоджойн через Zoom MCP (исследование feasibility) |

---

## Backlog — Phase 3: Autonomy

| ID | Priority | Component | Status | Title |
|---|---|---|---|---|
| LZA-030 | P1 | infra | TODO | Worker monitoring — uptime alerts |
| LZA-031 | P2 | web | TODO | Мультипользовательский режим |
| LZA-032 | P2 | watcher | TODO | Интеграция с Google Calendar |

---

## BLOCKED

_Нет заблокированных задач_
