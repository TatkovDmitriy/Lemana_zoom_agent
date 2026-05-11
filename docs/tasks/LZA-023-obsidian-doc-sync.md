# LZA-023 — Автосинк документации в Obsidian

**Статус**: Done  
**Приоритет**: Medium  
**Исполнитель**: Engineer  
**Reviewer**: PM

---

## Задача

При каждом мёрже в `main`, если изменились файлы в `docs/` или `CLAUDE.md`, автоматически обновлять соответствующие файлы в Obsidian-репозитории `TatkovDmitriy/Obsidian`.

## Целевая структура в Obsidian

```
10_Projects/Pet_Projects/Lemana_Zoom_Agent/
  CLAUDE.md
  backlog.md
  architecture.md
  adr/
    ADR-001-monorepo-structure.md
    ADR-002-*.md
    ...
  tasks/
    LZA-001-*.md
    ...
```

## Реализация

Создан GitHub Actions workflow: `.github/workflows/obsidian-sync.yml`

**Триггер**: `push` в `main`, paths `docs/**` или `CLAUDE.md`

**Логика**:
1. Для каждого файла получить текущий SHA через GitHub Contents API (нужен для update)
2. PUT запрос с base64-encoded содержимым
3. Статус 200/201 = успех

## Секреты

Необходимо добавить в GitHub repo secrets:

| Secret | Значение |
|---|---|
| `OBSIDIAN_SYNC_TOKEN` | GitHub Personal Access Token с правом `repo` на `TatkovDmitriy/Obsidian` |

**Как создать токен**:
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Repository access: только `TatkovDmitriy/Obsidian`
3. Permissions: Contents → Read and write
4. Скопировать токен → GitHub repo `Lemana_zoom_agent` → Settings → Secrets → Actions → New secret: `OBSIDIAN_SYNC_TOKEN`

## Что НЕ синкается

- Код (`apps/`, `packages/`) — не нужен в Obsidian
- `.env*` файлы — никогда
