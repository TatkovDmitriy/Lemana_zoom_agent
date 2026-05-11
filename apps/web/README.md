# apps/web — Next.js Web Catalog

Next.js 15 (App Router) веб-приложение. Каталог минуток встреч с Firebase Auth (Google SSO).

## Деплой: Vercel

1. Подключи GitHub-репозиторий в Vercel.
2. Root Directory: `apps/web` (или используй monorepo preset в Vercel).
3. Build Command: `cd ../.. && pnpm --filter @lemana/web build`
4. Output Directory: `.next`
5. Установи все env vars из `.env.example` (секция NEXT_PUBLIC_* и Firebase Admin).

## Локальный запуск

```bash
pnpm --filter @lemana/web dev
# или из корня:
pnpm dev --filter @lemana/web
```

## Структура

```
app/
  (auth)/sign-in/     Google SSO вход
  (app)/projects/     список проектов
  (app)/projects/[id] минутки проекта
  (app)/minutes/[id]  просмотр минутки
  api/
    zoom/webhook/     Zoom recording.completed → jobs/{id}
    projects/         CRUD проектов
    minutes/          CRUD минуток + move
    search/           полнотекстовый поиск
    telegram/bind/    one-time code для привязки бота
lib/
  firebase-admin.ts   Firebase Admin SDK singleton
  firebase-client.ts  Firebase Client SDK singleton
  auth.ts             withAuth() middleware для API routes
```

## Zoom Webhook

URL для Zoom App: `https://<vercel-domain>/api/zoom/webhook`

Настройка в Zoom App → Feature → Event Subscriptions:
- Event: `recording.completed`
- Endpoint URL: указанный выше
- Secret Token → положи в `ZOOM_WEBHOOK_SECRET_TOKEN`
