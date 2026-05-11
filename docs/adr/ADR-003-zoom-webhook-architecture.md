# ADR-003: Zoom Webhook через Web App, не Watcher

- **Дата**: 2026-05-11
- **Статус**: Принято
- **Автор**: PM (Claude)

## Контекст

Zoom отправляет webhook при завершении записи. Нужно решить — куда направить webhook: в watcher (Railway) или в web app (Vercel).

## Решение

Webhook принимает **web app** (`/api/zoom/webhook`), watcher слушает **Firestore job queue**.

```
Zoom → POST /api/zoom/webhook (Vercel)
              │
              ▼
         Firestore jobs
              │
              ▼
         Watcher (Railway, onSnapshot)
```

## Обоснование

- Vercel обрабатывает HTTPS и валидацию Zoom challenge из коробки
- Watcher как long-running сервис не подходит для приёма HTTP — Fastify добавляет complexity
- Decoupling: web и watcher независимы, можно перезапускать watcher без потери webhook событий (job остаётся в Firestore)
- Retry-логика бесплатна — job в Firestore можно перепроцессить

## Последствия

- Zoom Webhook URL = `https://lemana-zoom-agent-web.vercel.app/api/zoom/webhook`
- При падении watcher jobs накапливаются в Firestore и обрабатываются при рестарте
- Верификация подписи Zoom (HMAC-SHA256) — в web app
