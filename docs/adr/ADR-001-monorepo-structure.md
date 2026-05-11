# ADR-001: Monorepo структура проекта

- **Дата**: 2026-05-11
- **Статус**: Принято
- **Автор**: PM (Claude)

## Контекст

Проект состоит из трёх отдельных сервисов (web, watcher, bot) с общими типами данных. Нужно решить: монорепо или отдельные репозитории.

## Решение

Использовать монорепо с pnpm workspaces:

```
/apps/web         — Next.js (Vercel)
/apps/watcher     — Zoom worker + Summarizer
/apps/bot         — Telegram bot
/packages/shared  — общие типы, zod-схемы, утилиты
```

Корневой `package.json` управляет workspaces, общие скрипты через `turbo` (опционально).

## Обоснование

- Общие типы (`Meeting`, `MeetingMinutes`, `Project`) нужны всем трём сервисам — монорепо позволяет импортировать их без публикации npm-пакета
- Один PR покрывает изменения сразу в нескольких сервисах
- Vercel умеет деплоить из монорепо (указать `rootDirectory: apps/web`)
- Проще для небольшой команды (нет overhead на синхронизацию версий между репо)

## Последствия

- Engineer должен настроить `pnpm-workspace.yaml` и `packages/shared/package.json`
- Vercel deploy settings: `rootDirectory = apps/web`, build command = `pnpm --filter web build`
- Railway/Fly.io для watcher: `rootDirectory = apps/watcher`
- TypeScript paths должны быть настроены для резолюции `@lemana/shared`

## Альтернативы, которые не выбрали

- **Отдельные репо**: overhead на синхронизацию типов, сложнее атомарные изменения
- **Turborepo**: добавляет сложность, не нужен для текущего размера
