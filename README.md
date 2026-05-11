# Lemana Zoom Agent

Автономная система, которая подключается к корпоративным Zoom-встречам, генерирует структурированные минутки и синхронизирует их в веб-каталог, Obsidian и Telegram.

## Архитектура

```
Zoom event (webhook / MCP)
  └─► apps/watcher     — long-running Node worker (Railway)
        ├─► Summarizer  — Anthropic Claude API → structured minute
        ├─► Firestore   — persist minute + job queue
        ├─► Obsidian    — commit markdown via GitHub API
        └─► Telegram    — push to @LemanaZoomBot
apps/web               — Next.js 15 catalog (Vercel)
apps/bot               — Telegram bot @LemanaZoomBot (Railway)
packages/shared        — shared types, schemas, crypto, markdown utils
```

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind 4, shadcn/ui |
| Backend API | Next.js Route Handlers, Firebase Admin SDK |
| Auth | Firebase Auth (Google SSO) |
| DB | Firestore |
| Worker | Node.js 20, Fastify 5 |
| Bot | grammY |
| AI | Anthropic SDK (claude-sonnet-4-5, prompt caching) |
| Obsidian sync | Octokit (GitHub REST API) |
| Build | pnpm 9, turborepo 2, TypeScript 5.8 |
| CI | GitHub Actions |
| Deploy | Vercel (web) + Railway (watcher + bot) |

## Структура монорепо

```
apps/
  web/       Next.js на Vercel
  watcher/   Long-running worker — queue consumer + Summarizer + Obsidian + Telegram
  bot/       Telegram бот
packages/
  shared/    Типы, zod-схемы, AES-256-GCM, markdown-утилиты
infra/
  firestore.rules        Firestore Security Rules
  firestore.indexes.json Составные индексы
  railway.json           Railway deploy config
.github/workflows/ci.yml lint + typecheck + test + build
```

## Быстрый старт

```bash
# 1. Установи зависимости
pnpm install

# 2. Скопируй и заполни env
cp .env.example .env.local

# 3. Сборка shared (обязательно перед остальными пакетами)
pnpm --filter @lemana/shared build

# 4. Запуск всего в dev-режиме
pnpm dev

# Или отдельно:
pnpm --filter @lemana/web dev
pnpm --filter @lemana/watcher dev
pnpm --filter @lemana/bot dev
```

## Переменные окружения

Смотри `.env.example` — там все ключи с комментариями.

Для локальной разработки: создай `.env.local` в корне (не коммить).
Для деплоя: настрой в Vercel (web) и Railway (watcher + bot) через их UI.

### Генерация ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Деплой

- **Web**: подключи репозиторий в Vercel, установи env vars в настройках проекта.
- **Watcher + Bot**: создай Railway-проект, два сервиса с Dockerfile из `apps/watcher/` и `apps/bot/`. Env vars — в Railway Variables. Railway автоматически деплоит при пуше в `main`.

Подробнее — в `apps/*/README.md`.

## Zoom MCP

На первом запуске watcher с `ZOOM_USE_MOCK=false`:
1. Войди через SSO в защищённой среде (не в чате).
2. MCP-клиент сохранит refresh-токен в Firestore (`zoom_tokens/{email}`) в зашифрованном виде (AES-256-GCM).
3. Дальнейший доступ — автоматический через сохранённый токен.

## Тестирование

```bash
pnpm test:run             # все пакеты
pnpm --filter @lemana/shared test:run  # только shared

# Мок end-to-end (без реального Zoom):
ZOOM_USE_MOCK=true pnpm --filter @lemana/watcher dev
```

## Безопасность

- Firestore Security Rules: пользователь видит только свои документы (`ownerId == request.auth.uid`).
- Backend-only коллекции (`jobs`, `zoom_tokens`, `telegram_bindings`) закрыты для клиента.
- Zoom SSO-токены хранятся только в Firestore в зашифрованном виде (AES-256-GCM).
- Telegram: все handlers за whitelist `TELEGRAM_ALLOWED_USER_IDS`.
- Zoom webhook: проверка HMAC-SHA256 подписи `x-zm-signature`.
- Никаких секретов в логах и в коде.

## Обоснование выбора Railway

Railway выбран для watcher и bot потому что:
- Поддерживает long-running процессы (Vercel не подходит — timeout 10s/300s).
- Деплой из GitHub одной кнопкой с поддержкой Dockerfile.
- Встроенный Secret Manager в Variables.
- Простое управление несколькими сервисами в одном проекте.
- Pricing стартует от $5/мес (hobby plan).