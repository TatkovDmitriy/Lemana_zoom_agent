# Lemana Zoom Agent — Architecture

_Last updated: 2026-05-11_

## Обзор системы

Автономная система для записи и обработки корпоративных Zoom-звонков.

```
Zoom Recording
     │
     ▼ webhook (recording.completed)
Vercel Web App (/api/zoom/webhook)
     │
     ▼ write job to Firestore
Firestore (jobs collection)
     │
     ▼ onSnapshot listener
Railway Watcher
     │
     ├─▶ Zoom API → download transcript
     ├─▶ Claude API → generate minutes
     ├─▶ Firestore → save minutes
     ├─▶ GitHub API → push to Obsidian
     └─▶ Telegram → notify user
```

## Компоненты

### apps/web (Vercel)
- **URL**: https://lemana-zoom-agent-web.vercel.app
- **Stack**: Next.js 15, App Router, TypeScript, Tailwind CSS
- **Auth**: Firebase Auth (Google SSO)
- **DB**: Firebase Firestore (client + admin SDK)
- **API routes**:
  - `POST /api/zoom/webhook` — принимает Zoom события
  - `GET/POST /api/projects` — CRUD проектов
  - `GET/POST /api/minutes` — CRUD минуток
  - `GET /api/search` — поиск по минуткам

### apps/watcher (Railway)
- **URL**: https://lemanazoomagent-production.up.railway.app
- **Stack**: Fastify 5, TypeScript, Node.js 20
- **Функции**:
  - Слушает Firestore `jobs` коллекцию (onSnapshot)
  - Скачивает транскрипт через Zoom API
  - Генерирует минутки через Claude API (с prompt caching)
  - Сохраняет в Firestore
  - Пушит в Obsidian через GitHub API
  - Отправляет уведомление в Telegram

### apps/bot (не задеплоен)
- **Stack**: grammY, TypeScript
- **Команды**: /start, /projects, /last, /search
- **Статус**: код готов, деплой на Railway pending (LZA-015)

### packages/shared
- Общие TypeScript типы
- Zod схемы (MeetingMinutes, Project, ActionItem, Zoom events)
- AES-256-GCM crypto утилиты
- Markdown генератор для Obsidian

## Инфраструктура

| Сервис | Платформа | URL |
|---|---|---|
| Web | Vercel (Hobby) | https://lemana-zoom-agent-web.vercel.app |
| Watcher | Railway (Trial) | https://lemanazoomagent-production.up.railway.app |
| Bot | Railway | не задеплоен |
| Database | Firebase Firestore | project: impact-calc-lp |
| Auth | Firebase Auth | Google SSO |
| Obsidian | GitHub API | TatkovDmitriy/Obsidian |

## Поток данных

1. Zoom-запись завершается → Zoom отправляет webhook на `/api/zoom/webhook`
2. Web app верифицирует подпись (HMAC-SHA256), создаёт job в Firestore
3. Watcher подхватывает job через onSnapshot
4. Watcher скачивает транскрипт через Zoom API (S2S OAuth token)
5. Claude API генерирует структурированные минутки (title, summary, decisions, action items)
6. Минутки сохраняются в Firestore (`minutes` коллекция)
7. Markdown-файл пушится в Obsidian репо через GitHub API
8. Telegram уведомление отправляется пользователю (user_id: 882851072)

## Переменные окружения

См. `.env.example` в корне репо.

## ADRs

- [ADR-001](adr/ADR-001-monorepo-structure.md) — Monorepo с pnpm workspaces
