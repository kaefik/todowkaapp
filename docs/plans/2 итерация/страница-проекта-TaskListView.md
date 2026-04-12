# Страница проекта с задачами — План реализации (Вариант 3: TaskListView)

---

## Суть подхода

Извлечь из `GtdTaskList.tsx` общую часть (рендер списка задач, inline-создание, подзадачи, кнопки move/edit/delete) в новый переиспользуемый компонент `TaskListView`. Обе страницы — `GtdTaskList` и `ProjectDetail` — будут использовать его как строительный блок.

```
GtdTaskList (gtd_status=fixed)  → TaskListView
ProjectDetail (project_id=fixed) → TaskListView
```

---

## Что уже есть

### Существующие файлы

| Файл | Назначение |
|------|-----------|
| `frontend/src/routes/GtdTaskList.tsx` (452 строки) | Полноценный список задач с inline-созданием, подзадачами, фильтрами, move/edit/delete |
| `frontend/src/routes/ProjectDetail.tsx` (229 строк) | Базовая страница проекта: шапка + прогресс + простой список задач (только toggle/delete) |
| `frontend/src/hooks/useTasks.ts` | Хук для CRUD задач, принимает `TaskFilters` (включая `project_id`) |
| `frontend/src/hooks/useTaskFilter.ts` | Управление состоянием фильтров с debounce |
| `frontend/src/hooks/useSubtasks.ts` | Хук для CRUD подзадач |
| `frontend/src/components/TaskEditModal.tsx` | Модальное окно редактирования задачи |
| `frontend/src/components/TaskFilterPanel.tsx` | Панель фильтров + `HighlightText` |
| `frontend/src/api/httpClient.ts` | HTTP-клиент с авторефрешем токена |

### Существующие API (backend уже готов)

| Endpoint | Метод | Что делает |
|----------|-------|-----------|
| `/api/projects/{id}` | GET | Проект с прогрессом |
| `/api/projects/{id}/tasks` | GET | Задачи проекта |
| `/api/tasks?project_id=...` | GET | Задачи с фильтром по проекту (поддерживает все фильтры) |
| `/api/tasks/{id}/toggle` | PATCH | Переключить выполнение |
| `/api/tasks/{id}/move` | PATCH | Переместить в GTD-статус |
| `/api/tasks` | POST | Создать задачу |
| `/api/tasks/{id}` | PUT | Обновить задачу |
| `/api/tasks/{id}` | DELETE | Удалить задачу |
| `/api/tasks/{id}/subtasks` | GET/POST | Подзадачи |

**Вывод:** Backend полностью готов. Все изменения — только на frontend.

---

## Архитектура после рефакторинга

### Новая структура компонентов

```
frontend/src/components/TaskListView.tsx   ← НОВЫЙ (общий UI задач)
frontend/src/routes/GtdTaskList.tsx        ← РЕФАКТОРИНГ (тонкая обёртка)
frontend/src/routes/ProjectDetail.tsx      ← РЕФАКТОРИНГ (полная переработка)
```

### Иерархия компонентов

```
GtdTaskList
├── TaskFilterPanel
├── TaskListView
│   ├── inline-форма создания (form)
│   ├── TaskCard (для каждой задачи)
│   │   ├── HighlightText (подсветка поиска)
│   │   ├── TagChips (теги)
│   │   ├── SubtaskSection (подзадачи)
│   │   └── MoveButtons (перемещение между статусами)
│   └── TaskEditModal
└── (пустое состояние)

ProjectDetail
├── ProjectHeader (шапка: название, описание, прогресс-бар)
├── TaskFilterPanel (фильтры, но без фильтра проекта)
├── TaskListView
│   └── (те же компоненты, что и в GtdTaskList)
└── TaskEditModal
```

---

## Пошаговый план

### Шаг 1. Создать `TaskListView` — извлечь из `GtdTaskList`

**Файл:** `frontend/src/components/TaskListView.tsx`

**Что извлекаем из `GtdTaskList.tsx`:**
- Inline-форма создания задачи (строки 308–356)
- Рендер списка задач с карточками (строки 364–441)
- Компонент `SubtaskSection` (строки 23–118) — оставить внутри `TaskListView.tsx` или вынести в отдельный файл
- Обработчики: `handleAddTask`, `handleToggleTask`, `handleDeleteTask`, `handleEditTask`, `handleSaveTask`, `handleMoveTask`
- Вспомогательные данные: `moveTargets`, `formatDate`
- Состояние: `showDescription`, `isAdding`, `editingTask`, `inputRef`

**Props интерфейс `TaskListView`:**

```typescript
interface TaskListViewProps {
  // Данные
  tasks: Task[]
  isLoading: boolean
  error: string | null

  // Фильтры (для подсветки поиска)
  searchQuery?: string

  // Создание задач
  onAddTask: (data: { title: string; description?: string }) => Promise<void>
  showAddForm?: boolean          // скрыть форму для completed/trash
  defaultGtdStatus?: GtdStatus   // auto-set при создании
  defaultProjectId?: string      // auto-set при создании

  // Действия над задачами
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => Promise<void>
  onMoveTask: (id: string, status: GtdStatus) => Promise<void>
  onSaveTask: (id: string, data: UpdateTask) => Promise<void>
  onRefetch: () => void

  // Настройки отображения
  hideMoveButtons?: boolean      // скрыть кнопки перемещения
  moveTargets?: { status: GtdStatus; label: string }[]
  emptyMessage?: string          // текст при пустом списке
}
```

**Размер:** ~300 строк (извлечённые из GtdTaskList)

**Зависимости:**
- `useSubtasks` — для подзадач
- `TaskEditModal` — для редактирования
- `HighlightText` — для подсветки
- `react-hook-form` + `zod` — для inline-формы

---

### Шаг 2. Рефакторинг `GtdTaskList.tsx` — тонкая обёртка

**Файл:** `frontend/src/routes/GtdTaskList.tsx`

**Что остаётся:**
- Props: `gtdStatus`, `title`
- `useTaskFilter` с `gtd_status` по умолчанию
- `useTasks(activeFilters)` — загрузка данных
- Рендер: заголовок + `TaskFilterPanel` + `TaskListView`

**Что удаляется (перенесено в TaskListView):**
- `SubtaskSection` (весь компонент)
- Inline-форма создания
- Рендер карточек задач
- `moveTargets`, `formatDate`
- Состояния `showDescription`, `isAdding`, `editingTask`, `inputRef`
- `taskCreateSchema`, `TaskCreateFormData`
- Обработчики `handleAddTask`, `handleToggleTask`, `handleDeleteTask`, `handleEditTask`, `handleSaveTask`, `handleMoveTask`

**Результат:** ~60-80 строк вместо 452

```typescript
// Упрощённый GtdTaskList после рефакторинга
export function GtdTaskList({ gtdStatus, title }: GtdTaskListProps) {
  const { filters, searchInput, setSearchInput, updateFilter, clearFilters, hasActiveFilters } = 
    useTaskFilter({ gtd_status: gtdStatus })

  const activeFilters = useMemo(() => ({ ...filters, gtd_status: gtdStatus }), [filters, gtdStatus])
  const { tasks, isLoading, error, addTask, updateTask, toggleTask, moveTask, deleteTask, refetch } = 
    useTasks(activeFilters)

  const handleAddTask = async (data: { title: string; description?: string }) => {
    await addTask({ ...data, gtd_status: gtdStatus })
  }

  const handleDeleteTask = async (id: string) => {
    if (gtdStatus === 'trash') {
      if (!confirm('Удалить задачу навсегда?')) return
      await deleteTask(id)
    } else {
      await moveTask(id, 'trash')
    }
  }

  const handleSaveTask = async (id: string, data: UpdateTask) => {
    await updateTask(id, data)
    refetch()
  }

  const handleMoveTask = async (id: string, status: GtdStatus) => {
    await moveTask(id, status)
    refetch()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      <TaskFilterPanel
        filters={activeFilters} searchInput={searchInput}
        onSearchInput={setSearchInput} onUpdateFilter={updateFilter}
        onClearFilters={clearFilters} hasActiveFilters={hasActiveFilters} hideGtdStatus
      />
      <TaskListView
        tasks={tasks} isLoading={isLoading} error={error}
        searchQuery={filters.search}
        onAddTask={handleAddTask}
        showAddForm={gtdStatus !== 'completed' && gtdStatus !== 'trash'}
        defaultGtdStatus={gtdStatus}
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onSaveTask={handleSaveTask}
        onRefetch={refetch}
        emptyMessage="Нет задач."
      />
    </div>
  )
}
```

---

### Шаг 3. Переработка `ProjectDetail.tsx` — полноценная страница проекта

**Файл:** `frontend/src/routes/ProjectDetail.tsx`

**Новая структура:**
1. Шапка проекта (название, цвет, описание, прогресс-бар) — сохранить и улучшить
2. `TaskFilterPanel` — фильтры с `hideProject` (проект уже зафиксирован)
3. `TaskListView` — все задачи проекта с полным функционалом
4. Новые задачи автоматически привязываются к проекту (`defaultProjectId`)

**Ключевые отличия от текущей реализации:**

| Сейчас | После |
|--------|-------|
| Свой `fetchTasks` через `httpClient.get('/projects/{id}/tasks')` | `useTasks({ project_id: id })` — единый источник данных |
| Только toggle + delete | Полный функционал: inline-создание, подзадачи, move, edit, фильтры |
| Нет фильтров | `TaskFilterPanel` с возможностью фильтровать по контексту, области, тегам, дедлайну |
| Нет поиска | Поиск по задачам проекта с подсветкой |
| Нет inline-создания | Можно создавать задачи прямо в проекте |
| Нет перемещения между статусами | Кнопки перемещения (→ Inbox, → Next, → Waiting, → Someday, → Trash) |
| Нет подзадач | Полная поддержка подзадач |
| Нет редактирования | `TaskEditModal` |

**Размер:** ~120-150 строк

```typescript
// Упрощённый ProjectDetail после рефакторинга
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [projectError, setProjectError] = useState<string | null>(null)

  // Загрузка проекта
  useEffect(() => { /* fetch project via httpClient */ }, [id])

  // Задачи проекта через стандартный хук
  const { filters, searchInput, setSearchInput, updateFilter, clearFilters, hasActiveFilters } = 
    useTaskFilter({ project_id: id })
  const activeFilters = useMemo(() => ({ ...filters, project_id: id }), [filters, id])
  const { tasks, isLoading, error, addTask, updateTask, toggleTask, moveTask, deleteTask, refetch } = 
    useTasks(activeFilters)

  const handleAddTask = async (data: { title: string; description?: string }) => {
    await addTask({ ...data, project_id: id })
  }

  // ... обработчики аналогичны GtdTaskList

  return (
    <div className="space-y-6">
      {/* Кнопка назад */}
      {/* Шапка проекта: название, цвет, описание, прогресс */}
      {/* TaskFilterPanel с hideProject */}
      {/* TaskListView с defaultProjectId={id} */}
    </div>
  )
}
```

---

### Шаг 4. Обновить `TaskFilterPanel` — добавить `hideProject` prop

**Файл:** `frontend/src/components/TaskFilterPanel.tsx`

**Изменения:**
- Добавить prop `hideProject?: boolean`
- Когда `hideProject=true` — скрыть dropdown выбора проекта в панели фильтров
- Аналогично уже существующему `hideGtdStatus`

**Размер изменений:** ~10 строк

Это нужно для `ProjectDetail`, где проект уже зафиксирован в URL — нет смысла показывать фильтр по проекту.

---

### Шаг 5. Обновить `useTaskFilter` — поддержку `project_id`

**Файл:** `frontend/src/hooks/useTaskFilter.ts`

**Изменения:**
- Добавить `project_id` в список сохраняемых фильтров
- При вызове из `ProjectDetail` передавать `{ project_id: id }` как дефолтный фильтр

**Размер изменений:** ~5 строк

---

## Детальная карта изменений по файлам

| Файл | Действие | Строки изменений |
|------|----------|-----------------|
| `frontend/src/components/TaskListView.tsx` | **СОЗДАТЬ** | ~300 (новый) |
| `frontend/src/routes/GtdTaskList.tsx` | **РЕФАКТОРИНГ** | 452 → ~80 |
| `frontend/src/routes/ProjectDetail.tsx` | **ПЕРЕРАБОТКА** | 229 → ~150 |
| `frontend/src/components/TaskFilterPanel.tsx` | **МИНОЕ ОБНОВЛЕНИЕ** | +10 |
| `frontend/src/hooks/useTaskFilter.ts` | **МИНОЕ ОБНОВЛЕНИЕ** | +5 |

**Итого:** ~545 строк нового/изменённого кода, ~680 строк удалённого/перенесённого кода

---

## Порядок выполнения (dependency graph)

```
Шаг 1: TaskListView (создать) ──────────────┐
                                            │
Шаг 4: TaskFilterPanel (hideProject) ───────┤
                                            │
Шаг 5: useTaskFilter (project_id) ──────────┤
                                            │
Шаг 2: GtdTaskList (рефакторинг) ───────────┤  ← зависит от Шага 1
                                            │
Шаг 3: ProjectDetail (переработка) ─────────┘  ← зависит от Шагов 1, 4, 5
```

**Рекомендуемый порядок:**
1. Шаг 1 — создать `TaskListView`
2. Шаг 2 — рефакторинг `GtdTaskList` (проверить, что всё работает)
3. Шаг 4 — обновить `TaskFilterPanel`
4. Шаг 5 — обновить `useTaskFilter`
5. Шаг 3 — переработать `ProjectDetail`

---

## Что получает пользователь после реализации

### Страница проекта (`/projects/:id`)

```
┌──────────────────────────────────────────────────┐
│  ← Назад к проектам                              │
│                                                   │
│  🔵 Ремонт квартиры                              │
│  Косметический ремонт гостиной                    │
│  ████████░░░░░░░░░░░░  40%                       │
│  4 / 10 задач                                    │
│                                                   │
│  ┌──────────────────────────────────────────┐     │
│  │ 🔍 Поиск...  ▼ Контекст  ▼ Область      │     │
│  │ ▼ Теги  ▼ Дедлайн  ↕ Сортировка  ✕ Сброс│     │
│  └──────────────────────────────────────────┘     │
│                                                   │
│  ┌──────────────────────────────────────────┐     │
│  │ [Добавить задачу...            ] [+] [➕]│     │
│  └──────────────────────────────────────────┘     │
│                                                   │
│  ☐ Купить краску                                 │
│    Быстро сохнущая, матовая                      │
│    🏪 Покупки  📅 15 мая                         │
│    ▸ 0/2 подзадач                                 │
│    → Inbox  → Next  → Waiting  ✎ Edit  🗑 Удалить│
│                                                   │
│  ☐ Вызвать электрика                             │
│    ▸ 1/3 подзадач                                 │
│    → Inbox  → Next  → Waiting  ✎ Edit  🗑 Удалить│
│                                                   │
│  ☑ Снять старые обои                             │
│    ✓ Сделано 3 дня назад                          │
│    ✎ Edit  🗑 Удалить                             │
│  ─────────────────────────────────────────────── │
│  Выполненные (3)                                  │
│  ☑ Выбрать цвет стен                             │
│  ☑ Купить валик                                  │
│  ☑ Закрыть мебель пленкой                        │
└──────────────────────────────────────────────────┘
```

---

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| Рефакторинг GtdTaskList ломает GTD-страницы | Средняя | Пошаговый рефакторинг + ручная проверка каждой GTD-страницы после |
| Интерфейс TaskListView слишком сложный | Низкая | Props разбиты на логические группы, опциональные с дефолтами |
| Дублирование обработчиков между GtdTaskList и ProjectDetail | Низкая | Можно вынести общие хелперы в утилиты, но пока они простые |
| TaskFilterPanel не поддерживает hideProject | Нет | Уже поддерживает hideGtdStatus, паттерн тот же |

---

## Проверка (QA-чеклист)

После реализации проверить:

### GtdTaskList (все GTD-страницы)
- [ ] `/inbox` — задачи Inbox отображаются корректно
- [ ] `/next` — задачи Next Actions отображаются корректно
- [ ] `/waiting` — задачи Waiting For отображаются корректно
- [ ] `/someday` — задачи Someday отображаются корректно
- [ ] `/completed` — задачи Completed отображаются корректно
- [ ] `/trash` — задачи Trash отображаются корректно
- [ ] Inline-создание задачи работает
- [ ] Подзадачи: добавление, toggle, удаление
- [ ] Перемещение между статусами
- [ ] Редактирование через модал
- [ ] Фильтры и поиск
- [ ] Подсветка найденного текста
- [ ] Удаление (move to trash / permanent delete)

### ProjectDetail
- [ ] `/projects/:id` — страница проекта открывается
- [ ] Шапка: название, цвет, описание, прогресс-бар
- [ ] Все задачи проекта отображаются
- [ ] Inline-создание задачи → задача привязывается к проекту
- [ ] Toggle задачи → прогресс-бар обновляется
- [ ] Перемещение задач между GTD-статусами
- [ ] Редактирование задач через модал
- [ ] Фильтры работают (контекст, область, теги, дедлайн)
- [ ] Фильтр проекта скрыт (hideProject)
- [ ] Поиск по задачам проекта
- [ ] Подзадачи: добавление, toggle, удаление
- [ ] Удаление задач из проекта
- [ ] Кнопка «Назад к проектам» работает
- [ ] Обработка: проект не найден
- [ ] Обработка: загрузка (skeleton)
- [ ] Новая задача при создании получает project_id автоматически

### Общее
- [ ] `npm run lint` — без ошибок
- [ ] `npx tsc --noEmit` — без ошибок
- [ ] Существующие тесты проходят
