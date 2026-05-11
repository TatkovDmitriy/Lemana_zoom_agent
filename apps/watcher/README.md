# apps/watcher — Long-Running Worker

Node.js 20 + Fastify сервис. Слушает очередь `jobs` в Firestore, запускает pipeline:
транскрипт → Claude API → Firestore → Obsidian → Telegram.

## Деплой: Railway

1. Создай Railway-проект.
2. Добавь новый сервис: Source → GitHub, выбери репозиторий.
3. Root Directory: `/` (Dockerfile сам собирает workspace).
4. Dockerfile: `apps/watcher/Dockerfile`
5. Установи все env vars (раздел без `NEXT_PUBLIC_*`).

## Локальный запуск

```bash
# Dev с hot-reload:
pnpm --filter @lemana/watcher dev

# Mock-режим (не нужен реальный Zoom):
ZOOM_USE_MOCK=true pnpm --filter @lemana/watcher dev
```

## Переменные Railway

| Переменная | Обязательная | Описание |
|-----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | ✅ | Service account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | ✅ | Приватный ключ (с `\n` литералами) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key |
| `ANTHROPIC_MODEL` | — | Default: `claude-sonnet-4-5` |
| `GITHUB_TOKEN` | ✅ | PAT для коммитов в Obsidian repo |
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен бота |
| `TELEGRAM_ALLOWED_USER_IDS` | ✅ | Через запятую |
| `ENCRYPTION_KEY` | ✅ | 32 байта base64 |
| `WEB_APP_BASE_URL` | ✅ | Vercel URL |
| `ZOOM_USE_MOCK` | — | `true` для тестов без Zoom |

## Health Check

`GET /health` → `{ ok: true, ts: "..." }`

Railway health check: `http://${{RAILWAY_PRIVATE_DOMAIN}}:4000/health`
