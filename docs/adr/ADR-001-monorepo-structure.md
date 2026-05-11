# ADR-001: Monorepo структура проекта

- **Дата**: 2026-05-11
- **Статус**: Принято
- **Автор**: PM (Claude)

## Контекст

Проект состоит из трёх сервисов (web, watcher, bot) с общими типами данных.

## Решение

Монорепо с pnpm workspaces:

```
/apps/web         — Next.js (Vercel)
/apps/watcher     — Zoom worker + Summarizer
/apps/bot         — Telegram bot
/packages/shared  — общие типы, zod-схемы, утилиты
```

Корневой `package.json` управляет workspaces, Turborepo для параллельных скриптов.

## Обоснование

- Общие типы (`Meeting`, `MeetingMinutes`, `Project`) нужны всем трём сервисам
- Один PR покрывает изменения сразу в нескольких сервисах
- Vercel умеет деплоить из монорепо (`rootDirectory: apps/web`)
- Railway: `rootDirectory = apps/watcher`

## Последствия

- Vercel: `rootDirectory = apps/web`
- Railway (watcher): Dockerfile path = `apps/watcher/Dockerfile`, build context = корень репо
- Railway (bot): аналогично watcher
- TypeScript paths настроены для `@lemana/shared`

## Альтернативы, которые не выбрали

- **Отдельные репо**: overhead на синхронизацию типов
- **Без Turborepo**: выбрали Turborepo для параллельных build/test скриптов
