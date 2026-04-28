# План исправления синхронизации между устройствами

**Дата**: 2026-04-28
**Статус**: Исправлен после критики
**Критика**: `docs/plans/2026-04-28-sync-error-critique.md`

## Описание проблемы

Проекты, удалённые на одном устройстве, остаются на другом и не синхронизируются. Анализ выявил системные проблемы в архитектуре синхронизации, затрагивающие не только проекты, но и другие сущности.

---

## Выполненные исправления

### Backend: SSE-события для проектов, областей, контекстов, тегов

Добавлены SSE-события во все CRUD-эндпоинты:

| Файл | События |
|---|---|
| `backend/app/api/projects.py` | `project_created`, `project_updated`, `project_deleted` |
| `backend/app/api/areas.py` | `area_created`, `area_updated`, `area_deleted` |
| `backend/app/api/contexts.py` | `context_created`, `context_updated`, `context_deleted` |
| `backend/app/api/tags.py` | `tag_created`, `tag_updated`, `tag_deleted` |

### Frontend: SSE-слушатели

`frontend/src/components/SyncProvider.tsx` — расширены слушатели SSE для всех новых событий.

### Frontend: обработка серверных удалений при pull

`frontend/src/db/syncEngine.ts` — добавлена функция `removeServerDeleted()`:
- При pull для каждого ресурса собирает серверные ID
- Удаляет из IndexedDB записи со `_syncStatus === 'synced'`, которых нет в ответе сервера
- Гарантирует удаление «призраков» даже если SSE-событие потеряно
- **Защита от массового удаления**: пропускает если `serverIds.size === 0` или если удаляется >50% локальных записей (подозрение на неполный ответ сервера)

---

## Оставшиеся проблемы

### CRITICAL

**1. Checklist items НЕ синхронизируются — ни pull, ни push**
- `checklistItem` отсутствует в `RESOURCES` в `syncEngine.ts:24-114`
- Pull() НЕ загружает чеклисты с сервера
- Нет глобального API-эндпоинта для чеклистов — только `/tasks/{id}/checklist`
- Push-сторона: нет handler'а для `entityType: 'checklistItem'` в `push()` (`syncEngine.ts:410+`) — даже если мутации создаются локально, push не знает как их отправить (чеклисты вложены: `POST /tasks/{taskId}/checklist`, `PATCH /tasks/{taskId}/checklist/{itemId}`, `DELETE /tasks/{taskId}/checklist/{itemId}`)
- Device B никогда не получит изменения чеклиста
- **Решение**:
  - Backend: создать глобальный эндпоинт `GET /checklist` возвращающий все чеклист-айтемы пользователя (проверить наличие service-метода и Pydantic schema)
  - Frontend pull: добавить `checklistItem` в `RESOURCES` с transform-функцией (`task_id → taskId`, `is_completed → isCompleted`)
  - Frontend push: добавить handler для `checklistItem` в `push()` — route по action: `create` → `POST /tasks/{payload.taskId}/checklist`, `update` → `PATCH /tasks/{payload.taskId}/checklist/{entityId}`, `delete` → `DELETE /tasks/{payload.taskId}/checklist/{entityId}`
  - Убедиться что локальные операции с чеклистами (toggle, add, remove) создают мутации с `entityType: 'checklistItem'` и payload включает `taskId`

### HIGH

**2. Reorder проектов: нет SSE + нет мутации + orphaned _syncStatus**
- Backend `PUT /projects/reorder` (`projects.py:63`) — НЕ публикует SSE
- Frontend (`useProjects.ts:182`) при ошибке ставит `_syncStatus: 'modified'` но НЕ создаёт мутацию → **данные зависают навсегда** в modified-состоянии, SyncEngine их не отправит
- **Почему это критично**: `push()` читает **исключительно** из таблицы `mutations` (`syncEngine.ts:410-437`), а не из `_syncStatus`. Запись с `_syncStatus: 'modified'` но без мутации: (а) никогда не будет отправлена через push, (б) не защищена `shouldSkipMerge()` (`conflictResolution.ts:9-18`) — при pull сервер перезапишет локальное изменение
- Device B не узнаёт о reorder до periodic pull (до 15 мин)
- **Решение**:
  - Backend: добавить `_publish_project_event(user_id, 'all', 'reordered')` в reorder-эндпоинт
  - Frontend: создавать individual `update`-мутации для каждого проекта с `{ sort_order }` payload **вместо** optimistic `_syncStatus: 'modified'`. Паттерн: `db.mutations.add({ entityType: 'project', entityId: item.id, action: 'update', payload: JSON.stringify({ sort_order: item.sort_order }), ... })`. SyncEngine отправит при появлении сети
  - **НЕ откатывать** `_syncStatus` на `'synced'` при ошибке — это теряет reorder пользователя (при pull `mergeRecord()` при `synced` отдаёт приоритет серверу → старый порядок затирает новый)

**3. Reorder областей: нет SSE + нет мутации + orphaned _syncStatus**
- Абсолютно аналогично проектам. `areas.py:43`, `useAreas.ts:155`
- **Решение**: Аналогично проектам — SSE + создание мутаций, без отката

**4. Verb templates: полностью нет SSE**
- `verb_templates.py` — ни один эндпоинт не публикует SSE-события (включая reorder на строке 73)
- Нет слушателей на фронтенде
- Синхронизация только через periodic pull (до 15 мин задержка)
- **Решение**: Добавить `_publish_verb_event` во все CRUD + reorder эндпоинты, добавить SSE-слушатели `verb_template_created/updated/deleted` в SyncProvider

**5. Stop recurrence: нет мутации, нет обновления IndexedDB**
- `useRecurrences.ts:49` — прямой API-вызов `POST /tasks/{id}/stop-recurrence`
- Локальный IndexedDB не обновляется — задача продолжает показывать recurrence
- Оффлайн не работает вообще
- **Решение**: Обновлять IndexedDB напрямую (очищать `recurrenceType`, `recurrenceConfig`, `recurrenceEndDate`, ставить `isRecurring: false`, `_syncStatus: 'modified'`) + создавать update-мутацию с payload `{ recurrence_type: null, recurrence_config: null, recurrence_end_date: null, is_recurring: false }`. Убрать прямой API-вызов.

### MEDIUM

**6. Мёртвые SSE-слушатели**
- `task_created`, `task_deleted`, `task_moved`, `task_toggled`, `task_reordered`, `recurrence_stopped`, `trash_cleared` зарегистрированы в SyncProvider, но backend всегда шлёт `task_updated`
- **Решение**: Убрать неиспользуемые слушатели, оставить только `task_updated` и `checklist_updated`

**7. Backend `clear_completed` / `clear_trash` — мёртвый код**
- Фронтенд не вызывает эти эндпоинты, создаёт индивидуальные delete-мутации
- **Решение**: Использовать batch-эндпоинты для массовых операций (оптимизация)

**8. `add_tag_to_task` / `remove_tag_from_task` — мёртвый код**
- Фронтенд управляет тегами через `updateTask({ tag_ids })`
- **Решение**: Удалить неиспользуемые эндпоинты

---

## Конфликты при синхронизации reorder

Стратегия: **last-write-wins по `updatedAt`**. При одновременном reorder на двух устройствах:
- Каждый reorder обновляет `updatedAt` для всех затронутых записей
- При pull `mergeRecord()` сравнивает `updatedAt` — побеждает более поздний
- Это корректно: последний reorder «выигрывает», промежуточные состояния теряются — это ожидаемо для reorder

---

## Архитектура синхронизации (контекст для исполнителя)

### Push: mutations-driven
`push()` (`syncEngine.ts:410-437`) читает **исключительно** из таблицы `mutations` (`db.mutations`). Записи с `_syncStatus: 'modified'` **без** мутации никогда не будут отправлены. Алгоритм:
1. Читает все мутации, сортирует по `timestamp`
2. `deduplicateMutations()` — оставляет последнюю мутацию для каждого `entityType+entityId`
3. Отправляет батчами по 5, route по `entityType` и `action`

### Pull: mergeRecord + shouldSkipMerge
- `shouldSkipMerge()` (`conflictResolution.ts:9-18`) — если есть pending-мутация для `entityType+entityId`, pull **пропускает** эту запись (не перезаписывает локальные изменения)
- `mergeRecord()` (`conflictResolution.ts:20-32`) — если нет pending-мутаций: (1) нет локальной → берём серверную, (2) локальная `synced` → сервер побеждает, (3) локальная dirty → сравниваем `updatedAt`, новее побеждает
- `removeServerDeleted()` — удаляет локальные `synced`-записи, которых нет в серверном ответе. Guard: пропускает при `serverIds.size === 0` или >50% удалений

### Ключевой паттерн: мутации
Для любой операции, которую нужно синхронизировать оффлайн:
```typescript
db.mutations.add({
  id: crypto.randomUUID(),
  entityType: 'task' | 'project' | 'area' | ...,
  entityId: record.id,
  action: 'create' | 'update' | 'delete',
  payload: JSON.stringify(changedFields),
  timestamp: Date.now(),
  retryCount: 0,
  lastError: null,
})
```
Существующие примеры: задачи, проекты, области — все создают мутации через CRUD-функции.

---

## Риски

- **Clock drift**: `updatedAt` генерируется на клиенте (`new Date().toISOString()`). Расхождение часов устройств → некорректный conflict resolution. **Митигация**: рассмотреть server-side `updatedAt` в будущих итерациях
- **removeServerDeleted при неполном ответе**: 50% guard спасает от массового удаления, но при потере 30-49% данных локальные записи удалятся неправомерно. **Митигация**: в будущем — явный `GET /deleted` endpoint вместо инференса из отсутствия в ответе

---

## План исправления по приоритету

| # | Приоритет | Проблема | Задачи |
|---|---|---|---|
| 1 | CRITICAL | Checklist: нет pull + нет push | Backend `GET /checklist` + RESOURCES + push handler для checklistItem |
| 2 | HIGH | Reorder проектов (SSE + мутации) | SSE + создание update-мутаций (НЕ откат _syncStatus) |
| 3 | HIGH | Reorder областей (SSE + мутации) | SSE + создание update-мутаций (НЕ откат _syncStatus) |
| 4 | HIGH | Verb templates SSE (CRUD + reorder) | `_publish_verb_event` во все эндпоинты включая reorder + слушатели |
| 5 | HIGH | Stop recurrence | IndexedDB update + мутация вместо прямого API-вызова |
| 6 | MEDIUM | Мёртвые SSE-слушатели | Убрать 7 неиспользуемых слушателей, оставить `task_updated` + `checklist_updated` |
| 7 | MEDIUM | Мёртвый код tag endpoints | Удалить `add_tag_to_task` / `remove_tag_from_task` |
| 8 | LOW | Мёртвый код batch endpoints | Вынести в Phase 2 — оптимизация, не bugfix |
