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
| LZA-001 | P0 | infra | DONE | Monorepo scaffold |
| LZA-002 | P0 | shared | DONE | Shared types & Zod schemas |
| LZA-003 | P0 | watcher | DONE | Zoom OAuth + S2S App setup |
| LZA-004 | P0 | watcher | DONE | Webhook endpoint (recording.completed) |
| LZA-005 | P0 | watcher | DONE | Zoom transcript download |
| LZA-006 | P0 | watcher | DONE | Claude API summarizer (с prompt caching) |
| LZA-007 | P0 | watcher | DONE | Firebase write + ignoreUndefinedProperties |
| LZA-008 | P0 | bot | DONE | Telegram bot (/start, /projects, /last, /search) |
| LZA-009 | P0 | web | DONE | Next.js 15 + Firebase Auth |
| LZA-010 | P0 | web | DONE | API routes: projects, minutes, search |
| LZA-011 | P0 | web | DONE | Obsidian sync (Octokit) |
| LZA-012 | P0 | infra | DONE | CI (GitHub Actions) |
| LZA-013 | P0 | infra | DONE | Деплой watcher на Railway |
| LZA-014 | P0 | infra | DONE | Деплой web на Vercel |
| LZA-015 | P0 | infra | TODO | Деплой bot на Railway |
| LZA-016 | P0 | infra | BLOCKED | Zoom Webhook URL → Event Subscriptions |
| LZA-017 | P0 | web | IN PROGRESS | Google Auth — Firebase Console setup + fix |

---

## Backlog — Phase 2: Improvements

| ID | Priority | Component | Status | Title |
|---|---|---|---|---|
| LZA-020 | P1 | web | TODO | Поиск по минуткам (full-text) |
| LZA-021 | P1 | web | TODO | Редактирование минутки |
| LZA-022 | P1 | web | TODO | Теги и фильтрация |
| LZA-023 | P1 | shared | TODO | Obsidian sync improvements |
| LZA-024 | P2 | watcher | TODO | Автоджойн через Zoom MCP |

---

## Backlog — Phase 3: Autonomy

| ID | Priority | Component | Status | Title |
|---|---|---|---|---|
| LZA-030 | P1 | infra | TODO | Worker monitoring — uptime alerts |
| LZA-031 | P2 | web | TODO | Мультипользовательский режим |
| LZA-032 | P2 | watcher | TODO | Интеграция с Google Calendar |

---

## DONE

- LZA-001..014: полный pipeline реализован, watcher и web задеплоены ✅

---

## BLOCKED

- LZA-016: нет валидного webhook URL — разблокируется после LZA-017 (Google Auth fix)
- LZA-017: нужно включить Google Sign-in в Firebase Console + добавить домен vercel.app
