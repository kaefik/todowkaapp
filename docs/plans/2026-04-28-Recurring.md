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

#### 16. `catch_up_missed_tasks` не интегрирован

Метод существует, но не вызывается из API или шедулера. Мёртвый код.

---

## Исправленный план реализации

### Phase 1: Критические баги

#### 1.1. Нормализация дней недели

**Проблема:** Фронтенд шлёт 1-7, бекенд ожидает 0-6 в `calculate_next_due_date`.

**Решение:** Привести к единому стандарту. Варианты:
- **A (рекомендуется):** Нормализовать на приёме в API — в `calculate_next_due_date` делать `day - 1` для weekly `days`. Менее инвазивно, не ломает существующие данные.
- **B:** Изменить фронтенд на 0-6. Ломает обратную совместимость с уже сохранёнными задачами.

**Файлы:**
- `backend/app/services/recurrence_service.py` — добавить нормализацию в weekly-блок
- `backend/app/services/recurrence_service.py` — обновить `validate_recurrence_config` на `1-7`

#### 1.2. Исправление timezone в `calculate_next_due_date`

**Проблема:** Возвращает naive datetime, сравнивается с aware `recurrence_end_date`.

**Решение:** Сохранять timezone при вычислениях. Использовать `base_date.astimezone()` или хранить оригинальный tzinfo и применять к результату.

**Файлы:**
- `backend/app/services/recurrence_service.py:69` — не снимать tzinfo
- Все вычисления с timedelta сохраняют tz (timedelta не влияет на tz)

**Риск:** SQLite хранит datetime как строки. Нужно проверить, что `DateTime(timezone=True)` корректно возвращает aware datetime при чтении. Если нет — привести к UTC явно.

#### 1.3. Подключение и обновление `validate_recurrence_config`

**Проблема:** Валидация не вызывается, диапазон дней несовместим с фронтендом.

**Решение:**
1. Обновить диапазон дней на `1-7` (после пункта 1.1)
2. Вызывать в `create_task` и `update_task` (в TaskService или через Pydantic-схему)
3. Убрать `config.type` из валидации или привести к `task.recurrence_type`

**Файлы:**
- `backend/app/services/recurrence_service.py` — обновить validate
- `backend/app/services/task_service.py` — добавить вызов validate в create/update
- `backend/app/schemas/task.py` — опционально: Pydantic-валидатор для config

### Phase 2: Функциональные баги

#### 2.1. Исправление TaskUpdate валидатора

**Проблема:** `model_validator` не отличает "не прислали due_date" от "прислали due_date=None".

**Решение:** Использовать `model_validator(mode='before')` с проверкой полей в raw data, или убрать валидатор из TaskUpdate и проверять в service-слое с учётом существующих данных задачи.

**Файлы:**
- `backend/app/schemas/task.py:73-77`

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

#### 2.4. Сброс recurrence при перемещении в trash

**Решение:** Очищать `recurrence_type`, `recurrence_config`, `recurrence_end_date` при перемещении в trash.

**Файлы:**
- `backend/app/services/task_service.py:224-230`

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

**Решение:** В `useTasks.ts` при создании задачи с `recurrence_type` выставлять `isRecurring: true` локально.

**Файлы:**
- `frontend/src/hooks/useTasks.ts`

#### 3.4. Idempotency для toggle

**Решение:** Добавить проверку на существующую сгенерированную задачу с той же `due_date` перед созданием новой.

### Phase 4: Тесты

Добавить тесты на:
- Нормализацию дней недели (различные комбинации)
- Вычисление следующей даты (daily/weekly/monthly)
- Timezone-корректность
- Валидацию recurrence_config
- Копирование тегов
- Сброс recurrence при trash
- Граничные случаи (конец месяца, 29-31 февраля)

---

## Риски

| Риск | Митигация |
|------|-----------|
| SQLite теряет timezone при хранении | Исследовать поведение перед фиксом. При необходимости хранить всё в UTC явно |
| Существующие задачи с interval > 1 начнут работать по-новому | Проверить данные: `SELECT recurrence_config FROM tasks WHERE recurrence_type IS NOT NULL` |
| Нормализация дней сломает уже сохранённые задачи | Выбрать направление нормализации, проверить существующие данные |
| Двойной клик toggle без idempotency | Добавить в Phase 3 (не критично) |
