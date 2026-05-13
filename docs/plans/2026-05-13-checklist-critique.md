# Глубокая критика: Фикс дублирования элементов чеклиста

**Документ:** `docs/plans/2026-05-13-checklist.md`
**Подход:** слепая верификация — каждое утверждение плана сопоставлено с реальным кодом

---

## Таблица замечаний

| # | Линза | Проблема | Серьёзность | Место в плане |
|---|-------|----------|-------------|---------------|
| 1 | Осуществимость | `id=None` в конструкторе ChecklistItem ломает SQLAlchemy default → ошибка при flush | 🔴 BLOCKER | Фикс 1, п.2 |
| 2 | Осуществимость | Кольцевая зависимость: syncEngine → SyncProvider → syncEngine | 🔴 BLOCKER | Фикс 2 |
| 3 | Осуществимость | `Array.find(async ...)` — async callback в find ВСЕГДА возвращает первый элемент | 🔴 BLOCKER | Фикс 3, код очистки |
| 4 | Полнота | `IntegrityError` и `HTTPException` не импортированы в checklist_service.py | 🟡 WARNING | Фикс 1, п.2 |
| 5 | Архитектура | `rollback()` в сервисе нарушает управление сессией FastAPI (`get_db`) | 🟡 WARNING | Фикс 1, п.2 |
| 6 | Полнота | Race condition не устранён полностью — SSE может прийти до HTTP-ответа через другой TCP-канал | 🟡 WARNING | Фикс 2 |
| 7 | Полнота | Не указан файл для автотестов | 🟢 SUGGESTION | План тестирования |
| 8 | Полнота | Не указаны необходимые изменения импортов | 🟢 SUGGESTION | Фикс 1 |

---

## Детальный разбор

---

### 🔴 BLOCKER #1: `id=None` ломает SQLAlchemy default

**Утверждение плана (строка 113):**
```python
id=str(data.id) if data.id else None,  # использовать клиентский UUID
```

**Реальность в коде (`backend/app/models/checklist.py:13`):**
```python
id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
```

**Проблема:** В SQLAlchemy `default` используется **только когда атрибут не установлен**. Если передать `id=None` явно — default НЕ сработает, и SQLAlchemy попытается вставить NULL в primary key → ошибка на уровне БД.

Проверка: `id` объявлен как `Mapped[str]` (не Optional), `primary_key=True` → колонка NOT NULL. Передача `None` вызовет ошибку при `flush()`.

**Как воспроизвести:**
```
POST /api/tasks/{id}/checklist  {"title": "test", "position": 0}
→ checklist_service.create_item(data=ChecklistItemCreate(id=None, ...))
→ ChecklistItem(id=None, ...)        ← None ПЕРЕДАН явно
→ self.db.flush()                     ← IntegrityError: NULL in primary key
```

Сценарий срабатывает каждый раз, когда клиент НЕ отправляет `id` (старые версии клиента, API-клиенты, скрипты).

**Исправление:** Не передавать `id` вообще, если он не предоставлен:
```python
async def create_item(self, task_id, data):
    item_kwargs = dict(
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

---

### 🔴 BLOCKER #2: Кольцевая зависимость (circular import)

**Утверждение плана (строка 162):**
> `markPushEcho` нужно экспортировать из `SyncProvider.tsx` или вынести в отдельный модуль

**Реальность в коде:**

`frontend/src/components/SyncProvider.tsx:2`:
```js
import { pull, push, selectivePull, deleteLocalEntity, getResourceTypeFromSSE, type EntityType } from '../db/syncEngine'
```

`frontend/src/db/syncEngine.ts:1-7` — не импортирует из SyncProvider.

План предлагает добавить вызов `markPushEcho` внутри `executeMutationGroup` в `syncEngine.ts`. Это потребует:
```js
// syncEngine.ts (предлагается)
import { markPushEcho } from '../components/SyncProvider'  // ← НОВЫЙ ИМПОРТ
```

Результат: **SyncProvider → syncEngine → SyncProvider** — кольцевая зависимость. В Vite это приведёт к:
- `undefined` при импорте модулей
- Либо к crash при загрузке приложения

**Исправление:** Вынести `markPushEcho`, `isPushEcho` и `pushEchoEntities` в отдельный модуль `frontend/src/db/pushEcho.ts`. Оба файла импортируют из него без цикла:
```
SyncProvider.tsx → pushEcho.ts
syncEngine.ts   → pushEcho.ts
```

План упоминает эту возможность, но не делает её обязательной и не распознаёт, что импорт из SyncProvider в syncEngine **невозможен** из-за кольцевой зависимости.

---

### 🔴 BLOCKER #3: `Array.find(async ...)` — классический JS-баг

**Утверждение плана (строки 214-217):**
```typescript
const synced = ids.find(async id => {
  const record = await db.checklistItems.get(id)
  return record?._syncStatus === 'synced'
})
const keepId = synced ?? ids[0]
```

**Проблема:** `Array.find` вызывает callback для каждого элемента и проверяет truthiness результата. Async-функция ВСЕГДА возвращает `Promise` — а `Promise` всегда truthy. Поэтому:
- `synced` = `ids[0]` (первый элемент), **независимо от `_syncStatus`**
- Если первый элемент — локальный (не synced), он будет сохранён, а серверный — удалён
- Это **усугубляет** баг: вместо дубликатов пользователь потеряет серверные данные

**Исправление:** Заменить на последовательный for-loop:
```typescript
let keepId = ids[0]
for (const id of ids) {
  const record = await db.checklistItems.get(id)
  if (record?._syncStatus === 'synced') {
    keepId = id
    break
  }
}
```

---

### 🟡 WARNING #4: Отсутствующие импорты

**Утверждение плана (строки 118-124):** предлагает `except IntegrityError` и `raise HTTPException` в `checklist_service.py`.

**Реальность (`backend/app/services/checklist_service.py:1-9`):**
```python
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checklist import ChecklistItem
from app.schemas.checklist import ChecklistItemCreate, ChecklistItemUpdate
```

Нет импортов:
- `IntegrityError` (нужен `from sqlalchemy.exc import IntegrityError`)
- `HTTPException` (нужен `from fastapi import HTTPException`)

---

### 🟡 WARNING #5: `rollback()` в сервисе нарушает управление сессией

**Утверждение плана (строка 122):**
```python
except IntegrityError:
    await self.db.rollback()
    raise HTTPException(status_code=409, detail="Checklist item already exists")
```

**Реальность (`backend/app/database.py:48-55`):**
```python
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

FastAPI управляет сессией через `get_db`: commit после успешного ответа, rollback при исключении. Если сервис вызывает `rollback()` сам, а затем выбрасывает `HTTPException`:
1. Сервис: `rollback()` → сессия очищена
2. Сервис: `raise HTTPException`
3. `get_db` ловит `Exception` → вызывает `rollback()` повторно (no-op, но нарушает инкапсуляцию)

**Исправление:** Обрабатывать `IntegrityError` в route handler (`backend/app/api/checklist.py`), а не в сервисе:
```python
# checklist.py — route handler
from sqlalchemy.exc import IntegrityError

async def create_checklist_item(...):
    # ...
    try:
        item = await service.create_item(task_id, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Checklist item already exists")
    # ...
```

Сервис остаётся чистым (только бизнес-логика, без HTTP-концепций).

---

### 🟡 WARNING #6: Race condition не устранён полностью

**Утверждение плана (строка 140):**
> перенести вызов внутрь `executeMutationGroup` — сразу после успешного выполнения мутации

**Почему это не полностью решает проблему:**

SSE и HTTP-ответ идут через разные TCP-соединения (в HTTP/1.1) или разные stream'ы (в HTTP/2). Нет гарантии порядка доставки. Возможен сценарий:

```
t=0    executeMutation() отправляет POST
t=50ms Сервер создаёт item → пушит SSE в event_bus
t=55ms SSE отправлен клиенту через EventSource-соединение
t=60ms SSE получен клиентом → macrotask в очереди
t=70ms HTTP-ответ получен → executeMutation() resolve → microtask
```

Microtask (продолжение после `await`) выполнится ДО macrotask (SSE handler) — это гарантирует JS event loop. НО если SSE приходит ДО HTTP-ответа:

```
t=50ms Сервер создаёт item → пушит SSE
t=55ms SSE получен клиентом → macrotask в очереди
t=60ms SSE handler выполняется → isPushEcho() → false (echo ещё не установлен!)
t=65ms HTTP-ответ получен → markPushEcho() — уже поздно
```

**Вывод:** Перенос `markPushEcho` внутрь `executeMutationGroup` не гарантирует устранение race condition. Однако, при наличии Фикса 1 (UUID совпадают), race condition вызывает лишь лишний pull-запрос, но не дублирование. Фикс 2 — оптимизация трафика, не критичный.

---

### 🟢 SUGGESTION #7: Не указан файл для автотестов

Существующие тесты чеклиста находятся в `backend/tests/test_tasks.py` (строки 586-735). План должен указать этот файл.

### 🟢 SUGGESTION #8: Не указаны изменения импортов

Для Фикса 1 нужно:
- `backend/app/services/checklist_service.py` — не нужно никаких новых импортов (если не добавлять IntegrityError-обработку в сервис)
- `backend/app/api/checklist.py` — нужен `from sqlalchemy.exc import IntegrityError` (если обработка в route)

---

## Верификация утверждений плана

Утверждения о номерах строк и поведении кода проверены:

| Утверждение | Файл:строка | Верно? |
|-------------|-------------|--------|
| addItem генерирует UUID и создаёт мутацию с id | `useChecklist.ts:53-84` | ✅ |
| syncEngine отправляет только title+position | `syncEngine.ts:674-675` | ✅ |
| Сервер создаёт свой UUID через default | `checklist.py:13` | ✅ |
| markPushEcho вызывается после push() | `SyncProvider.tsx:53-58` | ✅ |
| SSE listener проверяет isPushEcho | `SyncProvider.tsx:131-147` | ✅ |
| executeMutationGroup if(success) блок | `syncEngine.ts:644-656` | ✅ |
| doPush markPushEcho блок | `SyncProvider.tsx:213-216` | ✅ |
| initialSyncInternal | `syncEngine.ts:321` | ✅ |

---

## Вердикт

```
VERDICT: 🔴 NEEDS REVISION — 3 критических бага в предлагаемом коде
```

**Обязательные исправления перед реализацией:**

1. **Фикс 1 п.2:** Заменить `id=str(data.id) if data.id else None` на условную передачу `id` (не передавать вообще если `data.id is None`). Без этого создание чеклиста без ID сломается.

2. **Фикс 2:** Вынести `markPushEcho`/`isPushEcho`/`pushEchoEntities` в отдельный файл `frontend/src/db/pushEcho.ts`. Импорт из SyncProvider в syncEngine невозможен.

3. **Фикс 3:** Заменить `ids.find(async id => ...)` на `for...of` с await. Текущий код всегда выбирает первый элемент.

**Рекомендуемые исправления:**

4. Перенести обработку `IntegrityError` из сервиса в route handler
5. Указать файл `backend/tests/test_tasks.py` для автотестов
