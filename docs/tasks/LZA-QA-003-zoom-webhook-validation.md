# LZA-QA-003 — Отладка: Zoom Webhook URL Validation

- **Дата**: 2026-05-11
- **Статус**: TODO
- **Приоритет**: P0 (блокирует весь пайплайн)
- **Компонент**: web / infra
- **Исполнитель**: QA

---

## Проблема

Zoom Marketplace не может подтвердить webhook endpoint:
```
URL validation failed. Try again later.
```

Endpoint: `https://lemana-zoom-agent-web.vercel.app/api/zoom/webhook`

При ручной проверке через curl:
```bash
curl -X POST https://lemana-zoom-agent-web.vercel.app/api/zoom/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"endpoint.url_validation","payload":{"plainToken":"test123"}}'
# Ответ: 403 Host not in allowlist
# Заголовок: x-deny-reason: host_not_allowed
```

---

## Что уже проверено

- `ZOOM_WEBHOOK_SECRET_TOKEN` добавлен в Vercel Environment Variables
- Vercel Deployment Protection — пользователь пытался отключить, но 403 остаётся
- Браузер открывает сайт нормально (кукис Vercel сессии пропускают)
- Код webhook handler корректен — схема `ZoomUrlValidationEventSchema` верна
- `node:crypto` используется корректно в Next.js App Router (Node runtime)

---

## Задача QA

### Шаг 1 — Точно определить источник 403

Проверь заголовки ответа подробно:
```bash
curl -v -X POST https://lemana-zoom-agent-web.vercel.app/api/zoom/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"endpoint.url_validation","payload":{"plainToken":"test123"}}' 2>&1
```

Заголовок `x-deny-reason: host_not_allowed` означает что блокирует **Vercel**, не Next.js.

### Шаг 2 — Проверить Vercel Deployment Protection

В Vercel Dashboard → проект → **Settings → Deployment Protection**:
- [ ] Vercel Authentication → должно быть **Disabled**
- [ ] Password Protection → **Disabled**
- [ ] Trusted IPs → **Disabled** или пустой список

Если что-то включено — отключить, сохранить, **передеплоить**.

### Шаг 3 — Проверить Vercel Project Settings → Domains

Возможно проект настроен с кастомным доменом, а `.vercel.app` субдомен заблокирован.
В **Settings → Domains** убедись что `lemana-zoom-agent-web.vercel.app` есть в списке и активен.

### Шаг 4 — Проверить Next.js конфиг

Файл `apps/web/next.config.ts` — убедись что нет `allowedHosts`, `allowedOrigins` или других host-ограничений.

### Шаг 5 — Если Vercel блокирует неизбежно

Добавить middleware исключение. Создать `apps/web/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/api/zoom/webhook',
};
```

Это явно пропускает webhook path через middleware без каких-либо проверок.

### Шаг 6 — Финальная проверка

После исправления:
```bash
curl -X POST https://lemana-zoom-agent-web.vercel.app/api/zoom/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"endpoint.url_validation","payload":{"plainToken":"test123"}}'
# Ожидаемый ответ: {"plainToken":"test123","encryptedToken":"<hmac-hash>"}
# HTTP Status: 200
```

Затем нажать **Validate** в Zoom Marketplace → должно пройти успешно.

---

## Критерии готовности

- [ ] `curl` на webhook endpoint возвращает 200 с `plainToken` + `encryptedToken`
- [ ] Zoom Marketplace показывает зелёный статус URL validation
- [ ] Event `recording.completed` добавлен в subscriptions
- [ ] LZA-016 закрыта

---

## Связанные файлы

- `apps/web/app/api/zoom/webhook/route.ts` — обработчик webhook
- `apps/web/next.config.ts` — конфиг Next.js
- `packages/shared/src/schemas.ts` — `ZoomUrlValidationEventSchema`
