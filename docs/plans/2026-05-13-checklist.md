# Фикс: дублирование элементов чеклиста

## Описание проблемы

При добавлении элементов чеклиста в задачу происходит дублирование: из 2 введённых элементов получается 4. Каждый элемент появляется дважды через несколько секунд после добавления.

## Корневые причины

### Баг 1: Рассинхронизация UUID клиента и сервера

Когда клиент создаёт элемент чеклиста (`useChecklist.ts:53-84`):

1. Клиент генерирует свой UUID (`uuidv4()`) — например, `client-aaa`
2. Сохраняет в IndexedDB с `_syncStatus: 'local'`
3. Создаёт мутацию с `action: 'create'`, payload: `{ title, position, task_id, id: 'client-aaa' }`

Когда sync-движок пушит на сервер (`syncEngine.ts:674`):

```js
case 'create': {
  await httpClient.post(base, { title: payload.title, position: payload.position })
  break
}
```

**Клиент НЕ отправляет свой UUID!** Только `title` и `position`.

Сервер (`checklist_service.py:37-45`) создаёт элемент с **своим собственным UUID**:

```python
item = ChecklistItem(task_id=str(task_id), title=data.title, position=data.position)
# id генерируется как default=lambda: str(uuid.uuid4())  (checklist.py:13)
```

Результат: один и тот же логический элемент имеет два разных ID:
- `client-aaa` — в IndexedDB клиента
- `server-bbb` — в базе сервера

### Баг 2: Состояние гонки (race condition) в push echo

Когда пуш завершается (`SyncProvider.tsx:53-57`):

```js
const sent = await push()
if (sent) {
  for (const { entityType, entityId } of sent) {
    markPushEcho(entityType, entityId)  // ← вызывается ПОСЛЕ завершения push
  }
}
```

Но сервер отправляет SSE `checklist_updated` **до того**, как HTTP-ответ возвращается клиенту. В `SyncSSEListener` (строка 131-147):

```js
this.es!.addEventListener(evt, (event) => {
  // ...
  if (!isPushEcho(resourceType ?? 'task', entityId)) {  // ← markPushEcho ещё не вызван!
    this.onPull?.(evt)  // → schedulePull (debounce 3000ms)
  }
})
```

**`markPushEcho` вызывается после завершения push, а SSE приходит во время push.** Защита от echo не срабатывает.

## Таймлайн дублирования

| Время    | Событие                                                                             |
|----------|-------------------------------------------------------------------------------------|
| t=0ms    | Пользователь добавляет элемент → IndexedDB: `client-aaa`                           |
| t=1500ms | Push debounce срабатывает → POST на сервер                                         |
| t=~1600ms| Сервер создаёт `server-bbb`, отправляет SSE `checklist_updated`                    |
| t=~1600ms| SSE приходит → `isPushEcho()` = false (echo ещё не установлен) → `schedulePull()`  |
| t=~1700ms| Push завершается → `markPushEcho()` вызван (уже поздно)                            |
| t=~4600ms| Pull срабатывает (1500+3000ms debounce) → сервер возвращает `server-bbb`            |
| t=~4600ms| `mergeAndPut` ищет `server-bbb` локально — не найден → создаёт новую запись         |
| Итого    | Две записи для одного элемента                                                      |

При добавлении 2 элементов — получается 4.

## Почему mergeAndPut не предотвращает дубликат

`conflictResolution.ts`:

1. `shouldSkipMerge('checklistItem', 'server-bbb')` — ищет pending-мутации для `server-bbb` → **0 найдено** (мутация привязана к `client-aaa`) → не пропускает
2. `mergeRecord(undefined, serverRecord)` — локальной записи с `server-bbb` нет → просто возвращает серверную → `bulkPut` создаёт **новую** запись

---

## План исправления

### Фикс 1 (основной): Передача клиентского UUID на сервер

UUID клиента и сервера станут одинаковыми → `mergeAndPut` найдёт локальную запись при pull и обновит её вместо создания дубликата. Положительный side-effect: `shouldSkipMerge` начнёт корректно находить pending-мутации для checklistItem (UUID совпадут).

> Миграция БД на сервере **не нужна** — изменение только в Pydantic-схеме и сервисе.

**Файлы:**

#### 1. `backend/app/schemas/checklist.py` — добавить поле `id`

```python
class ChecklistItemCreate(BaseModel):
    id: UUID | None = None
    title: str = Field(min_length=1, max_length=255)
    position: int = 0
```

#### 2. `backend/app/services/checklist_service.py` — использовать клиентский UUID

> **Важно:** Нельзя передавать `id=None` в конструктор `ChecklistItem` — это переопределит SQLAlchemy `default`, и `flush()` упадёт с NULL в primary key. Нужно условно не передавать `id` вообще.

```python
async def create_item(self, task_id: UUID | str, data: ChecklistItemCreate) -> ChecklistItem:
    item_kwargs: dict = dict(
        task_id=str(task_id),
        title=data.title,
        position=data.position,
    )
    if data.id:
        item_kwargs['id'] = str(data.id)
    item = ChecklistItem(**item_kwargs)
    self.db.add(item)
    await self.db.flush()
    return item
```

#### 3. `backend/app/api/checklist.py` — обработка IntegrityError в route handler

Обработка на уровне route (не сервиса), чтобы не загрязнять бизнес-логику HTTP-концепциями и не нарушать управление сессией `get_db`.

Добавить импорт:
```python
from sqlalchemy.exc import IntegrityError
```

Обернуть вызов `service.create_item`:
```python
async def create_checklist_item(request, task_id, data, current_user, db):
    # ... проверка задачи ...
    service = ChecklistService(db)
    try:
        item = await service.create_item(task_id, data)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Checklist item already exists",
        )
    await _publish_checklist_event(current_user.id, task_id, "item_created")
    return ChecklistItemResponse.model_validate(item)
```

#### 4. `frontend/src/db/syncEngine.ts:674` — отправлять `id` при create

```js
case 'create': {
  await httpClient.post(base, { id: payload.id, title: payload.title, position: payload.position })
  break
}
```

### Фикс 2: Перенос markPushEcho в отдельный модуль + внутрь executeMutationGroup

Проблема: `markPushEcho` находится в `SyncProvider.tsx`, а `SyncProvider` импортирует из `syncEngine.ts`. Прямой импорт из `SyncProvider` в `syncEngine` создал бы **кольцевую зависимость**.

Решение: вынести push-echo в отдельный модуль.

#### 1. Новый файл `frontend/src/db/pushEcho.ts`

```typescript
const pushEchoEntities = new Map<string, number>()
const PUSH_ECHO_WINDOW_MS = 5000

export function markPushEcho(entityType: string, entityId: string) {
  pushEchoEntities.set(`${entityType}:${entityId}`, Date.now())
}

export function isPushEcho(entityType: string, entityId?: string): boolean {
  const now = Date.now()
  for (const [key, ts] of pushEchoEntities) {
    if (now - ts > PUSH_ECHO_WINDOW_MS) {
      pushEchoEntities.delete(key)
    }
  }
  if (entityId) {
    return pushEchoEntities.has(`${entityType}:${entityId}`)
  }
  for (const key of pushEchoEntities.keys()) {
    if (key.startsWith(`${entityType}:`)) return true
  }
  return false
}
```

#### 2. `frontend/src/db/syncEngine.ts` — импортировать и вызвать markPushEcho

Добавить импорт:
```typescript
import { markPushEcho } from './pushEcho'
```

В `executeMutationGroup` (~строка 644) добавить вызов сразу после `if (success)`:
```js
if (success) {
  markPushEcho(mutation.entityType, mutation.entityId)
  await db.mutations.delete(mutation.id)
  // ... остальное без изменений
}
```

> **Примечание:** race condition между SSE и HTTP-ответом полностью не устраняется этим изменением (SSE может прийти через другой TCP-канал до resolve HTTP-ответа). Но при наличии Фикса 1 (UUID совпадают) race condition вызывает лишь лишний pull-запрос, а не дублирование данных.

#### 3. `frontend/src/components/SyncProvider.tsx` — заменить импорт и удалить дубли

Заменить локальное определение `markPushEcho`/`isPushEcho`/`pushEchoEntities` на:
```typescript
import { markPushEcho, isPushEcho } from '../db/pushEcho'
```

Удалить из `SyncProvider.tsx`:
- Константу `pushEchoEntities` (строка 19)
- Константу `PUSH_ECHO_WINDOW_MS` (строка 20)
- Функцию `markPushEcho` (строки 22-24)
- Функцию `isPushEcho` (строки 26-40)
- Блоки `markPushEcho` в `schedulePush()` (строки 55-58) — уже вызывается из `executeMutationGroup`
- Блоки `markPushEcho` в `doPush()` (строки 213-216) — уже вызывается из `executeMutationGroup`

### Фикс 3: One-time очистка существующих дубликатов

Пользователи уже имеют дубликаты в IndexedDB. Без очистки фикс не даст видимого эффекта.

**Файл:** `frontend/src/db/syncEngine.ts` — добавить функцию `cleanupChecklistDuplicates`

Логика:
1. Получить все checklistItems из IndexedDB
2. Сгруппировать по `taskId`
3. Внутри каждой группы найти записи с одинаковым `title` + `position`
4. Для каждой группы дубликатов: оставить запись с `_syncStatus === 'synced'` (серверная), остальные удалить
5. Вызвать один раз при инициализации (в `initialSync`)

> **Важно:** Использовать `for...of` с `await`, а не `Array.find(async ...)` — async callback в `Array.find` всегда возвращает Promise (truthy), и результат всегда первый элемент.

```typescript
export async function cleanupChecklistDuplicates(): Promise<void> {
  const all = await db.checklistItems
    .filter(i => i._syncStatus !== 'deleted')
    .toArray()

  const byTask = new Map<string, typeof all>()
  for (const item of all) {
    if (!byTask.has(item.taskId)) byTask.set(item.taskId, [])
    byTask.get(item.taskId)!.push(item)
  }

  const toDelete: string[] = []

  for (const [, items] of byTask) {
    const byTitlePos = new Map<string, typeof items>()
    for (const item of items) {
      const key = `${item.title}\0${item.position}`
      if (!byTitlePos.has(key)) byTitlePos.set(key, [])
      byTitlePos.get(key)!.push(item)
    }

    for (const [, group] of byTitlePos) {
      if (group.length <= 1) continue

      let keepId = group[0]!.id
      for (const item of group) {
        if (item._syncStatus === 'synced') {
          keepId = item.id
          break
        }
      }

      for (const item of group) {
        if (item.id !== keepId) toDelete.push(item.id)
      }
    }
  }

  if (toDelete.length > 0) {
    await db.checklistItems.bulkDelete(toDelete)
  }
}
```

Вызвать в `initialSyncInternal` (`syncEngine.ts:321`) после синхронизации ресурсов:
```js
await cleanupChecklistDuplicates()
```

> Функция идемпотентна — при отсутствии дубликатов ничего не делает. Можно безопасно вызывать при каждом логине.

---

## Порядок реализации

1. **Фикс 1** — передать UUID клиента на сервер (3 файла: schema, service, route + syncEngine)
2. **Фикс 3** — очистить существующие дубликаты (1 файл: syncEngine)
3. **Фикс 2** — вынести pushEcho в отдельный модуль + обновить импорты (3 файла: pushEcho.ts, syncEngine, SyncProvider)

## Сводка изменений файлов

| Файл | Изменение |
|------|-----------|
| `backend/app/schemas/checklist.py` | Добавить поле `id: UUID \| None = None` |
| `backend/app/services/checklist_service.py` | Условная передача `id` через `**item_kwargs` |
| `backend/app/api/checklist.py` | Обработка `IntegrityError` → 409 |
| `frontend/src/db/pushEcho.ts` | **Новый файл** — `markPushEcho`, `isPushEcho` |
| `frontend/src/db/syncEngine.ts` | Отправлять `id` при create; вызвать `markPushEcho` в `executeMutationGroup`; добавить `cleanupChecklistDuplicates` |
| `frontend/src/components/SyncProvider.tsx` | Удалить дубликаты push-echo функций, импортировать из `pushEcho.ts` |

## План тестирования

### Автотесты — `backend/tests/test_tasks.py`

1. **test_create_checklist_with_client_id** — POST с `id` → сервер использует клиентский UUID → response.id === request.id
2. **test_create_checklist_without_id** — POST без `id` → сервер генерирует UUID → response.id существует
3. **test_create_checklist_duplicate_id** — POST с существующим `id` → 409 Conflict

### Ручные сценарии

1. Добавить 2 элемента чеклиста → подождать 5 секунд → **должно быть 2 элемента** (не 4)
2. Перезагрузить страницу → **должно быть 2 элемента** (без дубликатов)
3. Добавить элемент офлайн → выйти онлайн → подождать синхронизации → **должно быть 3 элемента** (не 6)
4. Открыть приложение на двух вкладках → добавить элемент на одной → на второй появился без дублирования
