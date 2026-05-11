# apps/bot — Telegram Bot @LemanaZoomBot

grammY-бот. Получает минутки от watcher и отвечает на команды пользователей.

## Деплой: Railway

1. В том же Railway-проекте добавь второй сервис.
2. Dockerfile: `apps/bot/Dockerfile`
3. Установи env vars (те же Firebase + Telegram + WEB_APP_BASE_URL).

## Команды

| Команда | Описание |
|---------|---------|
| `/start [code]` | Привязать Telegram аккаунт к Firebase user |
| `/projects` | Список проектов |
| `/last` | Последняя минутка |
| `/search <query>` | Поиск по минуткам |

## Привязка аккаунта

1. Открой веб-каталог → Настройки → Telegram → «Получить код».
2. Введи в боте: `/start <полученный код>`.
3. Код одноразовый, действует 10 минут.

## Безопасность

Все обработчики находятся за `whitelist()` middleware. Любые сообщения от user_id не из `TELEGRAM_ALLOWED_USER_IDS` игнорируются молча, без ответа.
