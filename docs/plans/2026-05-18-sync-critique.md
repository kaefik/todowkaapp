# Критика плана: 2026-05-18-sync.md

**Дата**: 2026-05-18
**Документ**: `docs/plans/2026-05-18-sync.md`

---

## Сводка

| # | Линза | Проблема | Серьёзность | Исправление |
|---|-------|----------|-------------|-------------|
| 1 | Полнота | План не учитывает `calendarEvent` и `checklistItem` в tombstone | 🔴 BLOCKER | Добавить в таблицу вызовов tombstone |
| 2 | Точность кода | `clear_completed`/`clear_trash` уже публикует `tasks_cleared` в `:notifications` + `task_updated` в `:sync` | 🟡 WARNING | Учтена текущая двойная публикация |
| 3 | Архитектура | Mutex не покрывает `selectivePull` | 🔴 BLOCKER | Обернуть selectivePull в mutex |
| 4 | Архитектура | Mutex не покрывает `doPush`/`doPull` из `useEffect` (начальный push/pull) | 🟡 WARNING | Обернуть doPush/doPull в mutex |
| 5 | Полнота | Нет tombstone для `calendarEvent` — но delete endpoint существует | 🔴 BLOCKER | Добавить в таблицу |
| 6 | Согласованность | `router.py` — в плане «зарегистрировать deleted_router», но роутеры подключаются в `main.py`, а не в `router.py` | 🟡 WARNING | Изменить файл на `main.py` |
| 7 | Риск | Mutex timeout 30s может быть слишком мал для `pull()` при большом объёме данных | 🟡 WARNING | Увеличить timeout или сделать настраиваемым |
| 8 | Риск | `processTombstones` не обновляет `lastPullAt` — tombstone может обработаться повторно | 🟢 SUGGESTION | OK — tombstone endpoint использует `since`, повторная обработка безопасна |
| 9 | Точность кода | `extractEntityId` в плане не учитывает `calendar_event_id` | 🟡 WARNING | Добавить `data.calendar_event_id` |
| 10 | Полнота | `_publish_task_event` для `clear_completed`/`clear_trash` отправляет `task_id="all"` — tombstone обработает нормально, но SSE `tasks_cleared` содержит `task_id: "all"` | 🟢 SUGGESTION | OK — `tasks_cleared` триггерит полный pull |
| 11 | Риск | `processTombstones` вызывает `httpClient.get('/deleted')` — но фронтенд httpClient использует `/api` prefix | 🟡 WARNING | Проверить базовый URL httpClient |

---

## Детальный разбор

### 🔴 BLOCKER #1: Отсутствие calendarEvent и checklistItem в tombstone

**План (Шаг 1.2)** описывает tombstone для: task, project, area, context, tag.

**В коде**:
- `backend/app/api/calendar_events.py:119-132` — `delete_event` делает hard delete
- `backend/app/api/checklist.py:129-148` — `delete` для checklist items делает hard delete

Оба типа сущностей подвержены той же проблеме: удаление на одном устройстве не синхронизируется на другом при пропущенном SSE.

**Исправление**: Добавить `calendarEvent` и `checklistItem` в таблицу вызовов tombstone, либо явно указать почему они исключены.

### 🔴 BLOCKER #2: Mutex не покрывает selectivePull

**План (Шаг 1.1)** описывает mutex для `schedulePush` и `schedulePull`.

**В коде**: `SyncProvider.tsx:49-59` — `schedulePull` вызывает `selectivePull` (не полный `pull`) для non-task SSE событий. Этот `selectivePull` тоже подвержен гонке с push.

`selectivePull` (`syncEngine.ts:384-392`) делает тот же `mergeAndPut` что и `pull`, но только для выбранных ресурсов. Гонка push + selectivePull возможна.

**Исправление**: Обернуть selectivePull в тот же mutex.

### 🔴 BLOCKER #3: Нет tombstone для calendarEvent

Calendar events имеют SSE `calendar_event_deleted` в маппинге (`syncEngine.ts:26`), но план не включает `calendarEvent` в таблицу tombstone. Calendar events подвержены той же проблеме что и задачи — hard delete на сервере, при пропущенном SSE запись «зависает».

**Исправление**: Добавить `calendar_event` в таблицу tombstone (api/calendar_events.py).

### 🟡 WARNING #4: Mutex не покрывает начальный doPush/doPull

**Код**: `SyncProvider.tsx:224-225` — при монтировании вызываются `doPush()` и `doPull()` напрямую, минуя `schedulePush`/`schedulePull`.

Если одновременно срабатывает SSE-событие → `schedulePull` → и начальный `doPull`, они могут выполниться параллельно. С mutex это было бы безопасно.

**Исправление**: Обернуть `doPush` и `doPull` в `syncMutex.runExclusive()`.

### 🟡 WARNING #5: router.py vs main.py для регистрации роутера

**План (Шаг 1.2)** говорит: «Файл: `backend/app/api/router.py` — Зарегистрировать deleted_router».

**В коде**: Роутеры подключаются в `main.py:94-112` через `api_router.include_router(...)`. Файл `router.py` содержит только `review_api`. Технически можно добавить в `router.py`, но все остальные роутеры добавляются в `main.py`.

**Исправление**: Изменить файл на `main.py` для согласованности.

### 🟡 WARNING #6: Mutex timeout при большом pull

`pull()` делает `fetchAllPages` для 8 ресурсов (tasks, projects, areas, contexts, tags, verbTemplates, checklistItems, calendarEvents). При первом pull или большом `updated_since` окне это может занять больше 30 секунд, особенно на медленном соединении.

**Исправление**: Увеличить timeout для pull (60-90s), либо использовать отдельные таймауты для push и pull.

### 🟡 WARNING #7: httpClient и базовый URL для /deleted

**План (Шаг 1.3)**: `httpClient.get('/deleted?since=...')`

**В коде**: httpClient может добавлять `/api` prefix автоматически. Нужно убедиться что `/deleted` резолвится в `/api/deleted`, а не просто `/deleted`. Если endpoint зарегистрирован как `deleted_router = APIRouter(prefix="/deleted")` внутри `api_router` (prefix="/api"), то полный путь `/api/deleted`.

В `syncEngine.ts` все endpoints указаны как `/tasks`, `/projects` и т.д. — без `/api`. Значит httpClient добавляет его. План корректен, но стоит явно указать это.

### 🟡 WARNING #8: extractEntityId не учитывает calendar_event_id

**План (Шаг 3.1)**:
```typescript
function extractEntityId(data) {
  return data.task_id ?? data.project_id ?? data.area_id ??
         data.context_id ?? data.tag_id ?? data.verb_template_id ??
         data.calendar_event_id ?? data.checklist_item_id
}
```

Хотя `calendar_event_id` есть в функции, в коде `SyncProvider.tsx:98-106` events не включает `calendar_event_deleted` в массив подписок! План не исправляет это — `calendar_event_*` события не обрабатываются через SSE listener.

**Исправление**: Добавить `calendar_event_created`, `calendar_event_updated`, `calendar_event_deleted` в массив events в `SyncProvider.tsx`.

### 🟢 SUGGESTION #9: DeletionService.cleanup_old не нужен как scheduler job сразу

Tombstone таблица будет пустой при деплое. Scheduler job для очистки tombstone можно добавить позже, когда накопятся данные.

---

## Инверсия предположений

### 1. Mutex гарантирует отсутствие гонки
- **Предположение**: Mutex полностью устраняет BUG #1
- **Инверсия**: `doPush`/`doPull` из useEffect выполняются БЕЗ mutex
- **Влияние**: Гонка при начальной загрузке
- **Устранение**: Обернуть doPush/doPull в mutex (WARNING #4)

### 2. Tombstone endpoint покрывает все удаления
- **Предположение**: Все delete-операции записывают tombstone
- **Инверсия**: calendarEvent и checklistItem delete НЕ записывают tombstone
- **Влияние**: Удаления календарей/чеклистов не синхронизируются при пропущенном SSE
- **Устранение**: Добавить в таблицу вызовов (BLOCKER #1, #3)

### 3. SSE достаточно для доставки удалений
- **Предположение**: SSE доставляет `*_deleted` события надёжно
- **Инверсия**: SSE теряется при переподключении, закрытой вкладке, или queue overflow
- **Влияние**: Без tombstone — запись «зависает» навсегда
- **Устранение**: Именно это решает tombstone — OK, но нужно для ВСЕХ сущностей

---

## Пропущенные сценарии

| Сценарий | Риск | Рекомендация |
|----------|------|---------------|
| Вкладка закрыта во время pull → SSE пропущено → tombstone не обработан | 🟡 | Tombstone обработается при следующем pull — OK |
| Два устройства одновременно удаляют одну задачу | 🟢 | Оба tombstone записываются, при pull оба обработаются — OK |
| Offline toggle → push с explicit state → сервер уже удалена задача → 404 | 🟢 | syncEngine.ts:612-618 уже обрабатывает 404 — OK |
| `calendar_event_deleted` SSE не слушается SyncProvider | 🔴 | Добавить в массив подписок |
| Пользователь очищает корзину на устройстве A → устройство B offline | 🟡 | При следующем pull tombstone удалит все записи — OK |

---

## Вердикт

```
VERDICT: 🔴 NEEDS REVISION
```

**3 блокера**:
1. Отсутствие `calendarEvent` и `checklistItem` в tombstone — нарушает полноту решения
2. Mutex не покрывает `selectivePull` — гонка сохраняется для non-task сущностей
3. `calendar_event_*` события не обрабатываются SSE listener

**Рекомендация**: Исправить блокеры, затем повторить критику.
