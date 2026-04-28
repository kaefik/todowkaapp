# План исправления повторяющихся задач (Recurring Tasks)

**Дата:** 2026-04-28
**Статус:** В работе. Предварительные баги (500 на API) исправлены, рекуррентность ожидает проверки.

---

## Найденные проблемы

### Исправленные (блокировали тестирование)

#### 0.1. `ChecklistService.get_checklist_counts()` — несовпадение сигнатуры [ИСПРАВЛЕНО]

- Метод (`checklist_service.py:90`): `get_checklist_counts(self, task_id)` — 1 аргумент
- Вызов (`tasks.py:97,140`): `get_checklist_counts(current_user.id, t.id)` — 2 аргумента
- **Результат:** 500 на GET /tasks для всех пользователей
- **Фикс:** убран лишний аргумент `current_user.id` из обоих вызовов

#### 0.2. Отсутствующая миграция `areas.sort_order` [ИСПРАВЛЕНО]

- Модель `Area` содержит поле `sort_order`, но колонка отсутствовала в БД
- **Результат:** 500 на GET /areas, весь pull падал
- **Фикс:** `alembic upgrade head`

### Критические

#### 1. Несовпадение нумерации дней недели (frontend vs backend)

- **Фронтенд** (`RecurrenceEditor.tsx:23-31`): `WEEKDAY_KEYS` = `1-7` (Пн=1, Вс=7)
- **Бекенд** (`recurrence_service.py:82`): `base_date.weekday()` = `0-6` (Пн=0, Вс=6)
- **Бекенд** (`recurrence_service.py:84-87`): сравнивает `day > current_weekday` напрямую, без приведения
- **Результат:** пользователь выбирает "Понедельник" (1), бекенд обрабатывает как `weekday()=1` = **Вторник**. Смещение +1 день
- **Для monthly** (`recurrence_service.py:115`) сделано `target_weekday = day_of_week - 1` — корректно. Weekly — нет
- **Weekly с конкретными днями сломан для всех пользователей**

Пример: сегодня среда (`weekday()=2`), выбраны Пн и Пт → бекенд получает `[1, 5]`:
- `1 > 2` → False (Пн пропущен)
- `5 > 2` → True, delta=3 → возвращает **Субботу** вместо Пятницы

#### 2. TypeError: сравнение naive и aware datetime (снижен приоритет)

- `calculate_next_due_date` (`recurrence_service.py:69`): `base_date = task.due_date.replace(tzinfo=None)` — снимает timezone
- Возвращает **naive datetime**
- Строка 29: `next_due_date > task.recurrence_end_date` — сравнение naive с aware → `TypeError` в Python 3.12+
- **Уточнение после проверки БД:** SQLite хранит `due_date` как naive datetime (`tzinfo=None`). `recurrence_end_date` у большинства задач `None`. Баг проявится только если пользователь установит `recurrence_end_date` — что бывает редко. Но всё равно требует фикса.

#### 3. `validate_recurrence_config` несовместим с фронтендом

- Валидатор (`recurrence_service.py:260`): проверяет `0 <= d <= 6`
- Фронтенд отправляет `1-7` (Пн=1, Вс=7)
- При подключении валидации воскресенье (значение 7) будет **отклонено**
- `validate_recurrence_config` ждёт `config.get('type')`, но `calculate_next_due_date` читает `task.recurrence_type` — дубль

### Функциональные

#### 4. `validate_recurrence_config` нигде не вызывается

Метод существует, но не используется ни в `create_task`, ни в `update_task`. Клиент может передать любой JSON в `recurrence_config`.

#### 5. Нет UI для остановки повторений

- `useRecurrences.ts` экспортирует `stopRecurrence`, но нигде не вызывается
- Нет кнопки "Остановить повторение" в интерфейсе
- SSE-событие `recurrence_stopped` обрабатывается в `SyncProvider.tsx` — бекенд готов

#### 6. Теги не копируются в новую задачу

`generate_next_task` (`recurrence_service.py:32-47`) копирует все свойства, кроме тегов. `task.tags` не копируется.

#### 7. `TaskUpdate` валидатор ломает частичное обновление

`task.py:73-77`: `model_validator` проверяет `self.recurrence_type and not self.due_date`. При `PUT /tasks/{id}` с `{"recurrence_type": "daily"}` (без `due_date`) валидатор упадёт, т.к. `self.due_date = None` (дефолт Pydantic, а не значение из БД).

#### 8. Trash + recurrence конфликт

`move_task` (`task_service.py:224-230`) при перемещении в trash очищает `due_date`, `reminder_time`, `reminder_offsets`, но **не** `recurrence_type`/`recurrence_config`/`recurrence_end_date`. При восстановлении задача рекуррентная, но без `due_date` → `generate_next_task` вернёт None.

#### 9. `interval` игнорируется для weekly с `days` и для monthly

- Weekly с `days`: `interval` не используется, всегда следующий день/неделя
- Monthly: `interval` не используется, всегда +1 месяц
- Фронтенд позволяет установить `interval` — пользователь не знает, что он не работает

### Архитектурные

#### 10. Дублирование файлов схем

`backend/app/schemas/recurrence.py` и `backend/app/schemas/task_recurrence.py` полностью идентичны (22 строки).

#### 11. Дублирование компонентов на фронтенде

`TaskIcons` и `RecurrenceHistoryPopup` реализованы дважды:
- `frontend/src/components/TaskListView.tsx` (строки 99-156)
- `frontend/src/routes/Tasks.tsx` (строки 22-77)

#### 12. `status` в `TaskRecurrence` всегда `completed`

Поле не используется, всегда `'completed'`. Нет логики смены статуса.

#### 13. `is_recurring` не выставляется локально при создании

При создании задачи с повторением `isRecurring: false` в Dexie до первой синхронизации — иконка не отображается.

#### 14. Двойной клик toggle создаёт 2 задачи

Нет idempotency — при быстром двойном клике на toggle сгенерируется 2 задачи.

#### 15. `recurrence_config.type` дублирует `recurrence_type`

Тип хранится и в отдельном поле модели, и внутри JSON-конфига. Могут рассинхронизироваться.

#### 16. ~~`catch_up_missed_tasks` не интегрирован~~ [ОШИБКА В АНАЛИЗЕ]

Первоначально предполагалось, что метод — мёртвый код. Проверка показала: метод **вызывается** из `scheduler.py` (строки 201, 375). Удалять или игнорировать нельзя.

---

## Исправленный план реализации

### Phase 0: Предварительный анализ данных [НОВЫЙ ЭТАП]

**Цель:** Перед выбором направления нормализации выяснить, что реально хранится в БД.

**Шаги:**
1. Выполнить запрос к продакшн/разработческой БД:
   ```sql
   SELECT recurrence_type, recurrence_config
   FROM tasks
   WHERE recurrence_type IS NOT NULL
   LIMIT 50;
   ```
2. Определить формат `days` в существующих записях (0-6 или 1-7)
3. Проверить тип `due_date` при чтении из SQLAlchemy: aware или naive?
4. Зафиксировать результат — от него зависит выбор варианта A/B в Phase 1.1

**Если БД пуста** (нет рекуррентных задач) — выбрать вариант A без миграции.
**Если БД содержит задачи с days** — выбрать вариант в зависимости от формата.

---

### Phase 1: Критические баги

#### 1.1. Нормализация дней недели

**Проблема:** Фронтенд шлёт 1-7, бекенд ожидает 0-6 в `calculate_next_due_date`. Monthly ожидает 1-7 (и делает `-1`), weekly — 0-6. Два стандарта в одном сервисе.

**Решение:** Привести к **единому стандарту 1-7** (Пн=1, Вс=7) во всём сервисе — так фронтенд и бекенд говорят на одном языке.

- **В `calculate_next_due_date`:** Weekly-блок: добавить `day = day - 1` перед сравнением с `weekday()` (как уже сделано для monthly). Monthly-блок: оставить как есть (уже корректно).
- **В `validate_recurrence_config`:** Обновить weekly-проверку на `1 <= d <= 7` (сейчас `0 <= d <= 6`).
- **Миграция данных:** Если Phase 0 выявил существующие задачи с `days` в формате 0-6 — написать Alembic migration для конвертации. Если БД пуста — миграция не нужна.

**Файлы:**
- `backend/app/services/recurrence_service.py` — добавить `day - 1` в weekly-блок, обновить validate
- `backend/alembic/` — миграция конвертации данных (если нужно по итогам Phase 0)

#### 1.2. Исправление timezone в `calculate_next_due_date`

**Проблема:** Возвращает naive datetime, сравнивается с aware `recurrence_end_date`.

**Решение:**
1. Проверить по итогам Phase 0 — возвращает ли SQLAlchemy aware или naive datetime при чтении из SQLite
2. Если aware — убрать `replace(tzinfo=None)` на строке 69, оставить tz как есть
3. Если naive — привести к UTC явно: `base_date = task.due_date.replace(tzinfo=timezone.utc)` и возвращать aware datetime

**Файлы:**
- `backend/app/services/recurrence_service.py:69`

#### 1.3. Подключение и обновление `validate_recurrence_config`

**Проблема:** Валидация не вызывается, диапазон дней несовместим с фронтендом, `config.get('type')` не существует в config.

**Решение:**
1. Обновить диапазон дней на `1-7`
2. Убрать чтение `config.get('type')` — тип брать из аргумента `recurrence_type` (передавать из task_service)
3. Вызывать в `create_task` и `update_task` в TaskService

**Файлы:**
- `backend/app/services/recurrence_service.py` — обновить validate
- `backend/app/services/task_service.py` — добавить вызов validate в create/update

### Phase 2: Функциональные баги

#### 2.1. Исправление валидаторов TaskCreate и TaskUpdate

**Проблема:** `model_validator` не отличает "не прислали due_date" от "прислали due_date=None". Затронуты **обе** схемы: TaskCreate (строки 49-53) и TaskUpdate (строки 73-77).

**Решение:** Убрать валидатор из Pydantic-схем. Проверять в service-слое с учётом существующих данных задачи (для update) и входных данных (для create). Это даёт доступ к текущему состоянию задачи из БД.

**Файлы:**
- `backend/app/schemas/task.py:49-53` (TaskCreate) — убрать model_validator
- `backend/app/schemas/task.py:73-77` (TaskUpdate) — убрать model_validator
- `backend/app/services/task_service.py` — добавить проверку в create_task/update_task

#### 2.2. Кнопка "Остановить повторение" в UI

**Решение:** Добавить кнопку в `RecurrenceHistoryPopup` или в `TaskEditModal`, вызывающую `stopRecurrence(taskId)`.

**Файлы:**
- `frontend/src/components/TaskListView.tsx` — добавить кнопку в RecurrenceHistoryPopup
- `frontend/src/routes/Tasks.tsx` — то же самое (или вынести в общий компонент)
- `frontend/src/hooks/useRecurrences.ts` — уже готов

#### 2.3. Копирование тегов в `generate_next_task`

**Решение:** После создания новой задачи копировать `task.tags` в `new_task.tags`.

**Файлы:**
- `backend/app/services/recurrence_service.py:32-52` — добавить копирование тегов
- Учитывать, что `task.tags` загружен через `selectinload`

#### 2.4. Trash + recurrence: сохранять настройки, отключать генерацию

**Проблема:** При перемещении в trash задача теряет `due_date`, но сохраняет recurrence-поля. При восстановлении — рекуррентная задача без due_date.

**Решение:** НЕ сбрасывать recurrence-поля (пользователь потеряет настройки без возможности восстановления). Вместо этого — в `generate_next_task` и `calculate_next_due_date` проверять `task.gtd_status != 'trash'` и пропускать задачи в корзине.

**Файлы:**
- `backend/app/services/recurrence_service.py` — добавить проверку статуса в generate_next_task
- `backend/app/services/task_service.py` — при восстановлении из trash восстанавливать `due_date` (сохранять оригинальное значение перед перемещением в trash)

### Phase 3: Улучшения

#### 3.1. Поддержка `interval` для weekly с `days` и для monthly

**Решение:**
- Weekly: при интервале > 1 и наличии `days`, после исчерпания дней в текущей неделе, перепрыгивать на `(interval-1)` недель вперёд
- Monthly: умножать смещение на `interval`

**Файлы:**
- `backend/app/services/recurrence_service.py` — weekly и monthly блоки

#### 3.2. Удаление дублирующихся файлов/компонентов

- Удалить `backend/app/schemas/task_recurrence.py` (дубль `recurrence.py`)
- Вынести `TaskIcons` и `RecurrenceHistoryPopup` в общий компонент, удалить дубли из `Tasks.tsx`

#### 3.3. `isRecurring` локально при создании

**Проблема:** `useTasks.ts:222` хардкодит `isRecurring: false`. Интерфейс `CreateTask` не включает recurrence-поля — задачи могут стать рекуррентными только через update.

**Решение:**
1. Расширить `CreateTask` для включения `recurrence_type`, `recurrence_config`, `recurrence_end_date`
2. При создании задачи с `recurrence_type` выставлять `isRecurring: true` локально в Dexie

**Файлы:**
- `frontend/src/hooks/useTasks.ts` — расширить CreateTask, исправить isRecurring
- `frontend/src/api/` — обновить типы если нужно

#### 3.4. Idempotency для toggle

**Решение:** Перед созданием новой задачи проверять наличие существующей TaskRecurrence с `(task_id, due_date)`. Если запись есть — пропустить генерацию.

**Файлы:**
- `backend/app/services/recurrence_service.py` — добавить проверку в generate_next_task

### Phase 4: Тесты

**Бэкенд:**
- Нормализация дней недели (различные комбинации 1-7)
- Вычисление следующей даты (daily/weekly/monthly)
- Timezone-корректность
- Валидацию recurrence_config (диапазон 1-7, структура config)
- Копирование тегов
- Пропуск задач в trash при генерации
- Граничные случаи (конец месяца, 29-31 февраля)
- Idempotency toggle (двойной вызов)

**Фронтенд:**
- isRecurring выставляется при создании с recurrence_type
- stopRecurrence вызывается корректно

---

## Риски

| Риск | Митигация |
|------|-----------|
| SQLite теряет timezone при хранении | Phase 0: проверить фактический тип. При необходимости хранить всё в UTC явно |
| Существующие задачи с `days` в формате 0-6 | Phase 0: проанализировать данные. Alembic migration для конвертации 0-6 → 1-7 |
| Нормализация сломает существующие задачи | Выбрать направление ТОЛЬКО после Phase 0. Миграция данных перед развёртыванием |
| Двойной клик toggle без idempotency | Phase 3.4: проверка (task_id, due_date) перед генерацией |
| Восстановление из trash без due_date | Сохранять оригинальный due_date перед trash, восстанавливать при undo |
| `catch_up_missed_tasks` вызывается из scheduler | Не удалять, не менять сигнатуру. Учесть при рефакторинге recurrence_service |
