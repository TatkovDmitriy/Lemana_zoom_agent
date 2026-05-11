# LZA-027 — Inbox: привязка минуток к проектам

- **Дата**: 2026-05-11
- **Статус**: TODO
- **Приоритет**: P0
- **Компонент**: web + watcher
- **Исполнитель**: Dev_agent_zoom_bot

---

## Контекст

Сейчас watcher сохраняет минутки в Firestore без `projectId` — система не знает в какой проект положить встречу. Нужно реализовать **Inbox**: все новые минутки падают без проекта, пользователь одним действием назначает проект прямо на сайте.

---

## Что нужно реализовать

### 1. Watcher — сохранять минутки без projectId

В `apps/watcher/src/pipeline.ts` при сохранении минутки в Firestore:
- `projectId: null` (или поле отсутствует)
- `status: 'done'`

Минутка попадает в `minutes` коллекцию без привязки к проекту.

### 2. Web — страница Inbox (`/inbox`)

Новая страница которая показывает все минутки без проекта (`projectId == null`).

**UI:**
- Заголовок "Входящие" + badge с числом непривязанных минуток
- Список карточек минуток (тема, дата, длительность, превью summary)
- На каждой карточке кнопка **"Назначить проект"** → открывает выпадающий список проектов пользователя
- После выбора проекта — минутка исчезает из Inbox и появляется в выбранном проекте

**Empty state:** "Все встречи распределены по проектам 🎉"

### 3. Web — API endpoint для назначения

```
PATCH /api/minutes/[id]/move
Body: { projectId: string }
```

- Проверяет что минутка принадлежит пользователю (ownerId == uid)
- Обновляет `projectId` и `updatedAt` в Firestore
- Возвращает обновлённую минутку

Файл: `apps/web/app/api/minutes/[id]/move/route.ts`

### 4. Web — Sidebar

Добавить пункт **"Входящие"** в `components/app-sidebar.tsx` с badge-счётчиком непривязанных минуток:

```tsx
{ href: '/inbox', label: 'Входящие', icon: Inbox, count: unassignedCount }
```

Счётчик подтягивается через `GET /api/minutes?projectId=null&limit=1` (только для получения total count).

### 5. Web — API для Inbox

```
GET /api/minutes?projectId=unassigned
```

Добавить в существующий `apps/web/app/api/minutes/route.ts` обработку параметра `projectId=unassigned`:
- Запрос: `.where('projectId', '==', null)`

---

## Firestore структура

Минутка без проекта:
```
/minutes/{minuteId}
  ownerId: string
  projectId: null          ← ключевое поле
  topic: string
  summary: string
  date: Timestamp
  ...
```

---

## Критерии готовности (DoD)

- [ ] Watcher сохраняет минутки с `projectId: null`
- [ ] `/inbox` показывает непривязанные минутки
- [ ] Кнопка "Назначить проект" работает — минутка переезжает в проект
- [ ] После назначения минутка пропадает из Inbox
- [ ] Sidebar показывает пункт "Входящие" с счётчиком
- [ ] `pnpm --filter web build` — 0 ошибок
- [ ] `pnpm --filter watcher build` — 0 ошибок

---

## Примечания

- Не нужен drag-and-drop, не нужна сортировка — просто список + выбор проекта
- Существующие минутки в `/projects/[id]` работают как раньше (у них уже есть projectId)
- Назначение необратимо в MVP (перемещение между проектами — Phase 2)
