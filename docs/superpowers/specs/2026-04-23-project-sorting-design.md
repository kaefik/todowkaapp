# Сортировка проектов на странице проектов

**Дата:** 2026-04-23
**Статус:** Approved

## Цель

Добавить возможность упорядочивания проектов на странице `/projects` двумя способами:
1. **Ручная сортировка** — drag-and-drop перетаскивание карточек проектов
2. **Быстрая авто-сортировка** — кнопки сортировки по имени, дате создания, количеству задач

Выбранный режим быстрой сортировки сохраняется в localStorage между сессиями.
Порядок проектов (sort_order) хранится в модели данных и синхронизируется между устройствами через SyncEngine.

## Подход

Поле `sort_order` (integer) добавляется в модель Project на бэкенде и в Dexie-схему на фронтенде. Это обеспечивает:
- Синхронизацию порядка между устройствами
- Переживает очистку localStorage
- Согласуется с local-first архитектурой

## Изменения бэкенда

### Модель Project (`backend/app/models/project.py`)

Добавить колонку:
```python
sort_order = Column(Integer, default=0, nullable=False, server_default="0")
```

### Миграция Alembic

Новая миграция добавляет `sort_order` с default=0 для всех существующих проектов.

### Pydantic-схемы (`backend/app/schemas/project.py`)

- `ProjectResponse`: добавить поле `sort_order: int`
- `ProjectCreate`: добавить опциональное `sort_order: int | None = None`
- `ProjectUpdate`: добавить опциональное `sort_order: int | None = None`

### API (`backend/app/api/projects.py`)

Новый эндпоинт:
```
PUT /projects/reorder
Body: { items: [{ id: str, sort_order: int }] }
Response: { ok: true }
```
Пакетное обновление sort_order для нескольких проектов одним запросом.

### ProjectService (`backend/app/services/project_service.py`)

- `get_projects()`: сортировка `sort_order ASC, created_at DESC` вместо `created_at DESC`
- `create_project()`: если sort_order не задан, устанавливать `max(sort_order) + 1`
- `reorder_projects()`: новый метод для пакетного обновления sort_order
- Валидация: все id в reorder-запросе принадлежат пользователю

## Изменения фронтенда

### Dexie-схема (`frontend/src/db/database.ts`)

- Добавить `sortOrder` в интерфейс `DbProject`
- Bump версии схемы (upgrade: `sortOrder = 0` для существующих записей)

### SyncEngine (`frontend/src/db/syncEngine.ts`)

- Pull-маппинг: `sort_order` → `sortOrder`
- Push-маппинг: `sortOrder` → `sort_order`
- Обработка reorder-запроса: `PUT /projects/reorder`

### Хук useProjects (`frontend/src/hooks/useProjects.ts`)

- Сортировка результатов по `sortOrder ASC`
- Новый метод `reorderProjects(items: {id, sortOrder}[])` — обновляет Dexie + отправляет reorder через SyncEngine
- Новый метод `autoSortProjects(mode: 'name' | 'date' | 'tasks')` — пересчитывает sortOrder и вызывает reorderProjects

### UI — страница Projects (`frontend/src/routes/Projects.tsx`)

#### Библиотека DnD
`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`

#### Панель сортировки (над списком)
- 3 кнопки: «По имени» (A→Я), «По дате» (новые→старые), «По задачам» (больше→меньше)
- Активная кнопка визуально выделена
- При нажатии вызывается `autoSortProjects(mode)`, результат сохраняется в localStorage (`projects_sort_mode`)
- При загрузке: если в localStorage есть `projects_sort_mode` — применить; иначе — порядок из sort_order

#### Drag handle
- Иконка-ручка (≡) слева от каждой ProjectCard
- Захват за ручку — перетаскивание, остальная область карточки — клик для перехода к деталям
- Во время перетаскивания: карточка приподнимается (shadow + scale), placeholder на исходной позиции

#### DnD-поток
1. Пользователь перетаскивает карточку
2. `onDragEnd` в `DndContext` определяет новый порядок
3. Пересчитываются sortOrder для затронутых проектов
4. Вызывается `reorderProjects()` — обновляет Dexie + отправляет reorder на бэкенд

### localStorage

- Ключ: `projects_sort_mode`
- Значения: `'name'` | `'date'` | `'tasks'` | `null` (ручной порядок)
- null означает, что используется ручной DnD-порядок

## Порядок реализации

1. Бэкенд: модель + миграция + схемы + сервис + API
2. Фронтенд: Dexie-схема + SyncEngine + useProjects
3. Фронтенд: UI — панель сортировки + DnD
4. Тестирование и обновление docs/features.md
