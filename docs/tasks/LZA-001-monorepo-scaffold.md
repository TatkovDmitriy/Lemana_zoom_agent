# [LZA-001] [P0] [infra] Monorepo scaffold — базовая структура проекта

**Назначено**: Engineer  
**Приоритет**: P0 — разблокирует все остальные задачи  
**Связанные задачи**: LZA-002, LZA-009, LZA-003  
**ADR**: ADR-001

---

## Контекст

Репозиторий пустой (только README.md). Прежде чем начать разработку любого сервиса, нужна базовая монорепо-структура с pnpm workspaces. Без неё ни web, ни watcher, ни bot нельзя начать.

---

## Acceptance Criteria

Считать задачу выполненной, когда:

1. **pnpm workspace** настроен, `pnpm install` в корне устанавливает все зависимости
2. **`/apps/web`** — Next.js 14 (App Router) инициализирован, `pnpm --filter web dev` запускается без ошибок
3. **`/apps/watcher`** — Node.js TypeScript сервис, точка входа `src/index.ts`, `pnpm --filter watcher dev` запускается
4. **`/apps/bot`** — Node.js TypeScript сервис, точка входа `src/index.ts`, `pnpm --filter bot dev` запускается
5. **`/packages/shared`** — TypeScript пакет с именем `@lemana/shared`, экспортирует заглушки типов (см. ниже)
6. Импорт `import { MeetingMinutes } from '@lemana/shared'` работает во всех трёх apps без ошибок TypeScript
7. Каждое app содержит `.env.example` с нужными переменными (без значений)
8. `.gitignore` покрывает `node_modules`, `.env.local`, `.env`, `dist`, `.next`

---

## Что именно реализовать

### Корневая структура

```
/
├── package.json              # pnpm workspaces root
├── pnpm-workspace.yaml
├── tsconfig.base.json        # базовый tsconfig, который наследуют все apps
├── .gitignore
├── apps/
│   ├── web/
│   ├── watcher/
│   └── bot/
└── packages/
    └── shared/
```

### `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### `/packages/shared`
- `package.json` с `name: "@lemana/shared"`, `main: "src/index.ts"` (для dev через ts-node / tsx)
- `src/index.ts` — экспортирует базовые типы-заглушки:
  ```typescript
  export interface Project {
    id: string;
    name: string;
    createdAt: Date;
  }

  export interface MeetingMinutes {
    id: string;
    projectId: string;
    meetingId: string;
    title: string;
    date: Date;
    participants: string[];
    summary: string;
    actionItems: ActionItem[];
    rawTranscriptUrl?: string;
    createdAt: Date;
  }

  export interface ActionItem {
    text: string;
    assignee?: string;
    dueDate?: Date;
  }
  ```

### `/apps/web`
- Next.js 14 с App Router (`create-next-app` или вручную)
- TypeScript + Tailwind CSS
- `.env.example`:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=
  ```

### `/apps/watcher`
- Чистый Node.js + TypeScript (`ts-node` или `tsx`)
- `src/index.ts` с `console.log('Watcher started')`
- `package.json` dev script: `tsx src/index.ts`
- `.env.example`:
  ```
  ZOOM_ACCOUNT_ID=
  ZOOM_CLIENT_ID=
  ZOOM_CLIENT_SECRET=
  ZOOM_WEBHOOK_SECRET_TOKEN=
  ANTHROPIC_API_KEY=
  FIREBASE_SERVICE_ACCOUNT_KEY=
  PORT=3001
  ```

### `/apps/bot`
- Чистый Node.js + TypeScript
- `src/index.ts` с `console.log('Bot started')`
- `.env.example`:
  ```
  TELEGRAM_BOT_TOKEN=
  FIREBASE_SERVICE_ACCOUNT_KEY=
  ```

---

## Что НЕ нужно делать (out of scope)

- НЕ подключать Firebase (это LZA-007, LZA-009)
- НЕ писать бизнес-логику (webhook handlers, summarizer и т.д.)
- НЕ настраивать CI/CD (отдельная задача)
- НЕ деплоить никуда
- НЕ использовать Turborepo — обычный pnpm workspaces достаточно
- НЕ добавлять ESLint/Prettier конфиг (если только `create-next-app` не добавит автоматически)

---

## Технические детали

- Менеджер пакетов: **pnpm** (не npm, не yarn)
- TypeScript: **5.x**, strict mode включён
- Node.js: **20.x**
- Next.js: **14.x** (App Router)
- В `tsconfig.base.json`:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "moduleResolution": "bundler"
    }
  }
  ```
- Путь для `@lemana/shared` резолвится через `paths` в tsconfig каждого app:
  ```json
  {
    "paths": {
      "@lemana/shared": ["../../packages/shared/src/index.ts"]
    }
  }
  ```

---

## Definition of Done

- [ ] `pnpm install` в корне — без ошибок
- [ ] `pnpm --filter web dev` — Next.js стартует на localhost:3000
- [ ] `pnpm --filter watcher dev` — выводит 'Watcher started'
- [ ] `pnpm --filter bot dev` — выводит 'Bot started'
- [ ] `import { MeetingMinutes } from '@lemana/shared'` компилируется без ошибок
- [ ] Нет секретов в репо (только `.env.example` с пустыми значениями)
- [ ] Коммит запушен в ветку `claude/setup-lemana-pm-rNWI3`
