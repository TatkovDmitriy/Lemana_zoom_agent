# [LZA-013] [P0] [infra] Деплой watcher + bot на Railway

**Назначено**: Engineer / QA  
**Статус**: IN PROGRESS — заблокирован на Root Directory settings  

---

## Проблема

Railway пытается билдить из корня репо (там нет `package.json` для watcher). Нужно указать `apps/watcher` как root directory.

## Шаги

### 1. Настроить сервис watcher в Railway

Railway → сервис `Lemana_zoom_agent` → **Settings**:
- **Root Directory**: `apps/watcher`
- **Build Command**: `pnpm install && pnpm build` (или оставить auto-detect)
- **Start Command**: `node dist/index.js`
- **Branch**: `main`

### 2. Добавить Variables

```
ZOOM_ACCOUNT_ID=ZHJ81LAERXmVr7wg8UZS_A
ZOOM_CLIENT_ID=7DAiJEK8Qj69e7_0uAAUQ
ZOOM_CLIENT_SECRET=<получить от владельца>
ZOOM_WEBHOOK_SECRET_TOKEN=zy88CBleReSa4yzgcGKaUQ
TELEGRAM_ALLOWED_USER_IDS=882851072
ANTHROPIC_API_KEY=<получить от владельца>
FIREBASE_SERVICE_ACCOUNT_KEY=<получить от владельца>
PORT=3000
```

### 3. Получить публичный URL

Settings → Networking → **Generate Domain** → скопировать URL вида `https://xxx.railway.app`

### 4. Настроить Zoom Webhook

Zoom Marketplace → приложение → Feature → Event Subscriptions:
- Endpoint URL: `https://xxx.railway.app/webhook/zoom`
- Нажать **Validate** → **Save**

### 5. Задеплоить bot (отдельный сервис)

Railway → **+ New Service** → GitHub → тот же репо:
- **Root Directory**: `apps/bot`
- Variables: `TELEGRAM_BOT_TOKEN`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `TELEGRAM_ALLOWED_USER_IDS=882851072`

## Definition of Done

- [ ] Watcher запущен, в логах нет ошибок
- [ ] Публичный URL получен
- [ ] Zoom Webhook URL настроен и валидирован
- [ ] Bot запущен, отвечает на /start
- [ ] Тестовый webhook replay проходит полный pipeline
