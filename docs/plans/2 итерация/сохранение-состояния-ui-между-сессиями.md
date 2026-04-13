# План реализации: Сохранение состояния UI между сессиями

---

## Обзор

**Проблема:** При перезагрузке страницы пользователи теряют настройки интерфейса (свернутые разделы, фильтры, активные вкладки).

**Цель:** Сохранять все состояния UI в `localStorage` и восстанавливать их при следующем входе.

**Статус:** ⚠️ Актуально — из 7 состояний сохраняется только 1 (тема).

---

## Текущее состояние

| Элемент UI | Файл:строка | Сохраняется? | Приоритет |
|------------|-------------|--------------|-----------|
| `theme` (тема) | Settings.tsx:13-23 | ✅ Да (УЖЕ РЕАЛИЗОВАНО) | — |
| `isCompletedCollapsed` | Tasks.tsx:41 | ❌ Нет | 🔴 Высокий |
| `showDescription` (TaskListView) | TaskListView.tsx:170 | ❌ Нет | 🟡 Средний |
| `expanded` (SubtaskSection) | TaskListView.tsx:47 | ❌ Нет | 🟢 Низкий |
| `activeTab` (Settings) | Settings.tsx:11 | ❌ Нет | 🔴 Высокий |
| `expanded` (TaskFilterPanel) | TaskFilterPanel.tsx:49 | ❌ Нет | 🟡 Средний |
| `searchOpen` (TaskFilterPanel) | TaskFilterPanel.tsx:50 | ❌ Нет | 🟡 Средний |
| `filters` (useTaskFilter) | useTaskFilter.ts:20-23 | ❌ Нет | 🔴 Высокий |

---

## Архитектурное решение

### Подход 1: Хук `useLocalStorage` (РЕКОМЕНДУЕТСЯ)

Создать переиспользуемый хук для работы с localStorage.

**Плюсы:**
- ✓ Консистентный API во всем приложении
- ✓ Автоматическая синхронизация с localStorage
- ✓ Поддержка TypeScript
- ✓ Обработка ошибок

**Минусы:**
- Требует создания дополнительного хука

### Подход 2: Прямой доступ к localStorage

Использовать `localStorage.getItem/setItem` напрямую в каждом компоненте.

**Плюсы:**
- Простой подход
- Не требует создания хука

**Минусы:**
- ✗ Дублирование кода
- ✗ Нет типизации
- ✗ Нет обработки ошибок
- ✗ Риск ошибок

**Выбор:** Подход 1 — хук `useLocalStorage`

---

## Детальный план реализации

### Этап 1: Создание инфраструктуры (1-2 часа)

#### Задача 1.1: Создать хук `useLocalStorage`

**Файл:** `frontend/src/hooks/useLocalStorage.ts`

```typescript
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}
```

**Приёмка:**
- [ ] Хук создаётся
- [ ] Поддерживает примитивные типы
- [ ] Поддерживает объекты
- [ ] Обрабатывает ошибки JSON.parse
- [ ] Поддерживает функциональное обновление

---

### Этап 2: Сохранение состояния в Tasks.tsx (1 час)

#### Задача 2.1: Сохранить `isCompletedCollapsed`

**Файл:** `frontend/src/routes/Tasks.tsx:41`

**До:**
```typescript
const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false)
```

**После:**
```typescript
const [isCompletedCollapsed, setIsCompletedCollapsed] = useLocalStorage(
  'ui-tasks-completed-collapsed',
  false
)
```

**Приёмка:**
- [ ] Состояние загружается из localStorage при первом рендере
- [ ] Состояние сохраняется при изменении
- [ ] Перезагрузка страницы сохраняет состояние

---

### Этап 3: Сохранение состояния в TaskListView.tsx (1.5 часа)

#### Задача 3.1: Сохранить `showDescription`

**Файл:** `frontend/src/components/TaskListView.tsx:170`

**До:**
```typescript
const [showDescription, setShowDescription] = useState(false)
```

**После:**
```typescript
const [showDescription, setShowDescription] = useLocalStorage(
  'ui-tasklist-show-description',
  false
)
```

#### Задача 3.2: Сохранить `expanded` в SubtaskSection

**Проблема:** SubtaskSection используется для каждой задачи, сохранение по одному ключу перезапишет состояние для всех задач.

**Решение:** Использовать префикс с ID задачи

**Файл:** `frontend/src/components/TaskListView.tsx:47`

**До:**
```typescript
const [expanded, setExpanded] = useState(false)
```

**После:**
```typescript
const storageKey = `ui-subtask-expanded-${taskId}`
const [expanded, setExpanded] = useLocalStorage(storageKey, false)
```

**Приёмка:**
- [ ] Состояние сохраняется отдельно для каждой задачи
- [ ] Ключи localStorage имеют префикс `ui-subtask-expanded-`
- [ ] Состояние сохраняется и загружается корректно

---

### Этап 4: Сохранение состояния в Settings.tsx (0.5 часа)

#### Задача 4.1: Сохранить `activeTab`

**Файл:** `frontend/src/routes/Settings.tsx:11`

**До:**
```typescript
const [activeTab, setActiveTab] = useState<Tab>('general')
```

**После:**
```typescript
const [activeTab, setActiveTab] = useLocalStorage<Tab>(
  'ui-settings-active-tab',
  'general'
)
```

**Приёмка:**
- [ ] Состояние загружается при открытии настроек
- [ ] Состояние сохраняется при смене вкладки
- [ ] Типизация работает корректно

---

### Этап 5: Сохранение состояния в TaskFilterPanel.tsx (1.5 часа)

#### Задача 5.1: Сохранить `expanded`

**Файл:** `frontend/src/components/TaskFilterPanel.tsx:49`

**До:**
```typescript
const [expanded, setExpanded] = useState(false)
```

**После:**
```typescript
const [expanded, setExpanded] = useLocalStorage(
  'ui-filter-panel-expanded',
  false
)
```

#### Задача 5.2: Сохранить `searchOpen`

**Файл:** `frontend/src/components/TaskFilterPanel.tsx:50`

**До:**
```typescript
const [searchOpen, setSearchOpen] = useState(false)
```

**После:**
```typescript
const [searchOpen, setSearchOpen] = useLocalStorage(
  'ui-filter-search-open',
  false
)
```

**Приёмка:**
- [ ] Оба состояния сохраняются независимо
- [ ] Состояние фильтров и поиска сохраняется между сессиями
- [ ] UX не нарушается (плавные переходы)

---

### Этап 6: Сохранение фильтров в useTaskFilter (2 часа)

#### Задача 6.1: Определить тип для сохраняемых фильтров

**Файл:** `frontend/src/hooks/useTaskFilter.ts`

**Тип:**
```typescript
interface StoredFilters {
  gtd_status?: string
  context_id?: string
  area_id?: string
  project_id?: string
  tag_id?: string
  is_completed?: boolean
  due_date_from?: string
  due_date_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

interface StoredUiState {
  filters: StoredFilters
  searchQuery: string
}
```

#### Задача 6.2: Обновить хук для использования localStorage

**Файл:** `frontend/src/hooks/useTaskFilter.ts`

**Логика:**
- При инициализации: загрузить сохранённые фильтры из localStorage
- При изменении фильтров: сохранять в localStorage
- Ключ: `ui-task-filters`

**Пример реализации:**
```typescript
const STORAGE_KEY = 'ui-task-filters'

const loadStoredFilters = (): StoredUiState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : { filters: {}, searchQuery: '' }
  } catch {
    return { filters: {}, searchQuery: '' }
  }
}

const saveFilters = (filters: TaskFilters, searchQuery: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, searchQuery }))
  } catch (error) {
    console.error('Error saving filters to localStorage:', error)
  }
}
```

**Приёмка:**
- [ ] Фильтры загружаются при первом рендере
- [ ] Фильтры сохраняются при изменении
- [ ] Поисковый запрос также сохраняется
- [ ] Обработка ошибок при чтении/записи

---

### Этап 7: Очистка localStorage (опционально, 1 час)

#### Задача 7.1: Добавить кнопку очистки UI-состояния

**Файл:** `frontend/src/routes/Settings.tsx`

**Раздел:** Общие настройки

**UI:**
```typescript
<button
  onClick={() => {
    if (confirm('Сбросить все настройки интерфейса?')) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('ui-'))
        .forEach(key => localStorage.removeItem(key))
    }
  }}
  className="text-red-600 dark:text-red-400"
>
  Сбросить настройки интерфейса
</button>
```

**Приёмка:**
- [ ] Кнопка добавлена в настройки
- [ ] Подтверждение перед очисткой
- [ ] Удаляются только ключи с префиксом `ui-`
- [ ] Тема (`theme`) не затрагивается

---

## Сводная таблица задач

| # | Задача | Файл | Оценка | Приоритет |
|---|--------|------|--------|-----------|
| 1.1 | Создать хук `useLocalStorage` | `hooks/useLocalStorage.ts` | 1-2 часа | 🔴 Высокий |
| 2.1 | Сохранить `isCompletedCollapsed` | `routes/Tasks.tsx:41` | 0.5 часа | 🔴 Высокий |
| 3.1 | Сохранить `showDescription` | `components/TaskListView.tsx:170` | 0.5 часа | 🟡 Средний |
| 3.2 | Сохранить `expanded` (подзадачи) | `components/TaskListView.tsx:47` | 1 час | 🟢 Низкий |
| 4.1 | Сохранить `activeTab` | `routes/Settings.tsx:11` | 0.5 часа | 🔴 Высокий |
| 5.1 | Сохранить `expanded` (фильтры) | `components/TaskFilterPanel.tsx:49` | 0.5 часа | 🟡 Средний |
| 5.2 | Сохранить `searchOpen` | `components/TaskFilterPanel.tsx:50` | 0.5 часа | 🟡 Средний |
| 6.1 | Определить тип `StoredFilters` | `hooks/useTaskFilter.ts` | 0.5 часа | 🔴 Высокий |
| 6.2 | Реализовать сохранение фильтров | `hooks/useTaskFilter.ts` | 1.5 часа | 🔴 Высокий |
| 7.1 | Добавить кнопку очистки UI | `routes/Settings.tsx` | 1 час | 🟢 Низкий |

**Всего:** 8-10 часов

---

## Порядок выполнения

```
Этап 1 (Инфраструктура)
  └─► 1.1: Создать useLocalStorage

Этап 2 (Tasks.tsx)
  └─► 2.1: Сохранить isCompletedCollapsed

Этап 3 (TaskListView.tsx)
  ├─► 3.1: Сохранить showDescription
  └─► 3.2: Сохранить expanded (подзадачи)

Этап 4 (Settings.tsx)
  ├─► 4.1: Сохранить activeTab
  └─► 7.1: Добавить кнопку очистки

Этап 5 (TaskFilterPanel.tsx)
  ├─► 5.1: Сохранить expanded
  └─► 5.2: Сохранить searchOpen

Этап 6 (useTaskFilter.ts)
  ├─► 6.1: Определить типы
  └─► 6.2: Реализовать сохранение фильтров
```

---

## Ключи localStorage

После реализации все ключи будут иметь префикс `ui-`:

| Ключ | Тип | Значение по умолчанию |
|------|-----|----------------------|
| `theme` | `'light' \| 'dark'` | `'dark'` (системное) |
| `ui-tasks-completed-collapsed` | `boolean` | `false` |
| `ui-tasklist-show-description` | `boolean` | `false` |
| `ui-subtask-expanded-{taskId}` | `boolean` | `false` |
| `ui-settings-active-tab` | `'general' \| 'users'` | `'general'` |
| `ui-filter-panel-expanded` | `boolean` | `false` |
| `ui-filter-search-open` | `boolean` | `false` |
| `ui-task-filters` | `StoredUiState` | `{ filters: {}, searchQuery: '' }` |

---

## Тестирование

### Ручное тестирование

**Сценарий 1: Tasks.tsx**
1. Открыть страницу задач
2. Свернуть раздел "Completed"
3. Перезагрузить страницу
4. Ожидание: раздел остаётся свёрнутым

**Сценарий 2: TaskListView.tsx**
1. Нажать "+" для описания задачи
2. Перезагрузить страницу
3. Ожидание: поле описания показано
4. Раскрыть подзадачи у задачи
5. Перезагрузить страницу
6. Ожидание: подзадачи раскрыты

**Сценарий 3: Settings.tsx**
1. Открыть настройки
2. Переключиться на вкладку "Пользователи"
3. Перезагрузить страницу
4. Ожидание: активная вкладка "Пользователи"

**Сценарий 4: TaskFilterPanel.tsx**
1. Открыть поиск
2. Развернуть фильтры
3. Перезагрузить страницу
4. Ожидание: поиск и фильтры открыты

**Сценарий 5: Фильтры**
1. Установить несколько фильтров (контекст, область, сортировка)
2. Ввести поисковый запрос
3. Перезагрузить страницу
4. Ожидание: все фильтры и поиск сохранены

**Сценарий 6: Очистка**
1. Установить несколько состояний
2. Открыть настройки
3. Нажать "Сбросить настройки интерфейса"
4. Подтвердить
5. Перезагрузить страницу
6. Ожидание: все состояния сброшены, тема сохранена

### Автоматическое тестирование (опционально)

```typescript
// __tests__/hooks/useLocalStorage.test.ts
describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should load initial value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('saved-value'))
    // тест...
  })

  it('should save value to localStorage on change', () => {
    // тест...
  })

  it('should handle JSON parse errors', () => {
    localStorage.setItem('test-key', 'invalid-json')
    // тест...
  })
})
```

---

## Критерии приёмки

- [ ] Хук `useLocalStorage` реализован и протестирован
- [ ] Все 6 состояний UI сохраняются в localStorage
- [ ] Состояния восстанавливаются при перезагрузке страницы
- [ ] Ключи localStorage имеют префикс `ui-`
- [ ] Подзадачи сохраняются отдельно для каждой задачи (по ID)
- [ ] Фильтры и поисковый запрос сохраняются вместе
- [ ] Обработка ошибок при чтении/записи localStorage
- [ ] Кнопка очистки UI-состояния работает
- [ ] Тема не затрагивается при очистке UI-состояния
- [ ] Типизация работает корректно (TypeScript без ошибок)

---

## Риски и митигации

| Риск | Вероятность | Импакт | Митигация |
|------|-------------|--------|-----------|
| localStorage переполняется (5MB лимит) | Низкая | Средний | Очистка старых ключей, ограничение размера |
| JSON.parse/JSON.stringify ошибки | Средняя | Низкий | try-catch в хуке, fallback к default |
| Конфликт ключей между пользователями на одном устройстве | Низкая | Низкий | Использовать префикс `ui-`, уникальные ключи |
| State hydration mismatch в SSR | Низкая | Низкий | Приложение client-side only, не актуально |
| Потеря состояния при очистке браузера | Высокая | Низкий | Это ожидаемое поведение, не баг |

---

## Будущие улучшения

1. **Debounce сохранения** — сохранять фильтры с задержкой (300ms), чтобы не перегружать localStorage
2. **Миграция структуры данных** — при изменении структуры сохраняемых данных автоматически мигрировать старые данные
3. **Экспорт/импорт настроек** — возможность сохранить/загрузить все UI-настройки в файл
4. **Синхронизация между устройствами** — хранить UI-состояние на сервере (по желанию пользователя)
5. **Аналитика использования** — собирать анонимные данные о том, какие состояния UI чаще всего используются

---

## Заключение

После реализации этого плана все состояния UI будут сохраняться между сессиями, что значительно улучшит пользовательский опыт. Пользователи больше не будут терять свои настройки интерфейса при перезагрузке страницы.

**Общая оценка:** 8-10 часов работы, 6 файлов для изменения, 1 новый файл (хук).
