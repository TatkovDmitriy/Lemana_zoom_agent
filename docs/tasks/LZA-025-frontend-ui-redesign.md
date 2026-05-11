# LZA-025 — Качественный UI/UX фронтенд: каталог записей и управление проектами

- **Дата**: 2026-05-11
- **Статус**: TODO
- **Приоритет**: P0
- **Компонент**: web
- **Исполнитель**: Engineer

---

## Цель

Создать полноценный, визуально качественный фронтенд для веб-каталога Lemana Zoom Agent. Сейчас на `/projects` отображается только заглушка "Проектов пока нет." — нужен настоящий продукт.

---

## Что нужно реализовать

### 1. Layout & Navigation

- Боковое меню (sidebar) с навигацией: Проекты / Последние записи / Поиск
- Хедер с логотипом, именем пользователя (Firebase Auth), кнопкой выхода
- Responsive: desktop-first, но мобильный вид не должен ломаться
- Тёмная/светлая тема (опционально, но желательно)

### 2. Страница `/projects` — Каталог проектов

- Карточки проектов: название, описание, количество встреч, дата последней встречи
- Кнопка "Создать проект" → модальное окно/форма (название + описание)
- Создание проекта пишет в Firestore коллекцию `projects`
- Пустое состояние: красивый empty state с иллюстрацией/иконкой и CTA "Создать первый проект"
- Skeleton-загрузка пока данные подгружаются из Firestore

### 3. Страница `/projects/[projectId]` — Список встреч проекта

- Хлебные крошки: Проекты → Название проекта
- Список встреч (meeting minutes) в виде карточек:
  - Тема встречи (topic)
  - Дата и длительность
  - Краткое превью (первые 2 строки summary)
  - Статус: обрабатывается / готово
- Сортировка по дате (новые сверху)
- Пустое состояние: "Встреч пока нет — они появятся автоматически после записи Zoom"

### 4. Страница `/projects/[projectId]/meetings/[meetingId]` — Детальная минутка

- Заголовок: тема встречи + дата + длительность
- Участники (список)
- Полный текст meeting minutes (markdown → rendered HTML)
- Кнопка "Открыть запись" (ссылка на Zoom recording URL)
- Кнопка "Копировать" (копирует текст минутки)
- Секция "Транскрипт" (collapsible, если есть)

### 5. UX детали

- Все состояния загрузки → skeleton / spinner
- Toast-уведомления для действий (создан проект, скопировано)
- 404-страница для несуществующих встреч/проектов
- SEO: title и description для каждой страницы

---

## Технический стек

| Что | Как |
|---|---|
| Компоненты | shadcn/ui (уже в проекте или добавить) |
| Стили | Tailwind CSS |
| Иконки | lucide-react |
| Состояние | React hooks + Firestore real-time listeners |
| Формы | react-hook-form + zod (типы из `@lemana/shared`) |
| Уведомления | sonner (toast) |
| Markdown | react-markdown |

---

## Структура файлов

```
apps/web/
  app/
    layout.tsx                          — обновить: добавить Sidebar + Header
    projects/
      page.tsx                          — список проектов
      [projectId]/
        page.tsx                        — список встреч проекта
        meetings/
          [meetingId]/
            page.tsx                    — детальная минутка
  components/
    layout/
      Sidebar.tsx
      Header.tsx
    projects/
      ProjectCard.tsx
      CreateProjectModal.tsx
      EmptyProjects.tsx
    meetings/
      MeetingCard.tsx
      MeetingDetail.tsx
      EmptyMeetings.tsx
    ui/                                 — shadcn компоненты
```

---

## Firestore структура (читаем)

```
/projects/{projectId}
  name: string
  description: string
  createdAt: Timestamp
  ownerId: string

/meetings/{meetingId}
  projectId: string
  topic: string
  startedAt: string (ISO)
  durationMin: number
  participants: string[]
  summary: string (markdown)
  transcriptUrl?: string
  recordingUrl?: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  createdAt: Timestamp
```

> Если коллекция `meetings` не существует — создай тестовую запись в Firestore вручную для разработки.

---

## Критерии готовности (Definition of Done)

- [ ] Страница `/projects` показывает карточки проектов, кнопку создания, empty state
- [ ] Создание проекта через форму работает (пишет в Firestore)
- [ ] Страница `/projects/[projectId]` показывает список встреч
- [ ] Страница детальной минутки рендерит markdown summary
- [ ] Нет TypeScript ошибок (`pnpm typecheck`)
- [ ] Нет console.error в браузере при нормальном сценарии
- [ ] Выглядит профессионально: отступы, шрифты, цвета консистентны

---

## Дизайн-референсы

Ориентируйся на стиль: Linear, Notion, Vercel Dashboard — чистый, минималистичный, с хорошей типографикой. Не нужно ничего сложного — хорошие отступы, консистентные цвета, читаемые шрифты.

---

## Зависимости

- Firebase Auth уже настроен (`apps/web/lib/firebase-admin.ts`)
- Firestore client-side: добавить `apps/web/lib/firebase-client.ts` если ещё нет
- Shared типы: `@lemana/shared` (Meeting, MeetingMinutes, Project)

---

## Примечания

- Не переусложнять: MVP фронтенд, не дизайн-система
- Реальные данные появятся когда заработает watcher (LZA-016); до этого тестируй на mock-данных в Firestore
