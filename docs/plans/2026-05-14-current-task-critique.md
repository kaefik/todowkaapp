# Критика плана: Копирование checklist_items при повторении задачи

**Дата:** 2026-05-14
**План:** `docs/plans/2026-05-14-current-task.md`
**Вердикт:** 🟡 CONDITIONAL

---

## Сводная таблица

| # | Линза | Проблема | Серьёзность | Исправление |
|---|-------|----------|-------------|-------------|
| 1 | Полнота | `catch_up_missed_tasks` не учтён | 🔴 BLOCKER | Добавить копирование чеклиста и в этот метод |
| 2 | Полнота | Дублирование логики создания задачи | 🟡 WARNING | Вынести в общий приватный метод |
| 3 | Техническая | Порядок flush() не оптимальный | 🟡 WARNING | Вставить код после существующего flush, а не до |
| 4 | Стиль | Import внутри метода | 🟢 SUGGESTION | Импорт на уровне модуля |
| 5 | Полнота | Тест: как отметить элементы выполненными | 🟡 WARNING | Уточнить использование PATCH endpoint |
| 6 | Полнота | Нет теста для `catch_up_missed_tasks` | 🟡 WARNING | Добавить тест для catch_up |

---

## Детальный разбор

### 🔴 BLOCKER #1: `catch_up_missed_tasks` не учтён

**Суть:** В `recurrence_service.py` есть **два** метода, создающих новые задачи из шаблона повторения:

1. `generate_next_task()` (строки 19-73) — при завершении задачи пользователем
2. `catch_up_missed_tasks()` (строки 246-326) — при старте сервера для пропущенных повторений

`catch_up_missed_tasks()` содержит **такой же код создания Task** (строки 292-308), но план его полностью игнорирует. Если починить только `generate_next_task`, то задачи, сгенерированные через `catch_up_missed_tasks` при старте сервера, всё равно будут без чеклиста.

**Исправление:** Добавить копирование чеклиста в оба метода, либо (лучше) вынести логику создания задачи с чеклистом в общий приватный метод.

### 🟡 WARNING #2: Дублирование логики создания задачи

**Суть:** `generate_next_task` (строки 48-63) и `catch_up_missed_tasks` (строки 292-308) содержат практически идентичный код:

```python
new_task = Task(
    user_id=task.user_id,
    title=task.title,
    description=task.description,
    ...
)
if task.tags:
    new_task.tags = list(task.tags)
```

Добавление копирования чеклиста в оба места ещё больше увеличит дублирование. Если в будущем добавится новое поле, которое нужно копировать — его придётся добавлять в 2+ местах.

**Исправление:** Вынести в приватный метод `_create_task_from_template(task, due_date, gtd_status)`:

```python
async def _create_task_from_template(self, task: Task, due_date: datetime, gtd_status: str) -> Task:
    new_task = Task(
        user_id=task.user_id,
        title=task.title,
        description=task.description,
        gtd_status=gtd_status,
        context_id=task.context_id,
        area_id=task.area_id,
        project_id=task.project_id,
        due_date=due_date,
        notes=task.notes,
        recurrence_type=task.recurrence_type,
        recurrence_config=task.recurrence_config,
        recurrence_end_date=task.recurrence_end_date,
        reminder_time=task.reminder_time,
        reminder_offsets=task.reminder_offsets,
    )
    if task.tags:
        new_task.tags = list(task.tags)
    
    self.db.add(new_task)
    await self.db.flush()
    
    await self._copy_checklist_items(task, new_task)
    
    return new_task
```

Тогда оба метода просто вызывают `self._create_task_from_template(...)`.

### 🟡 WARNING #3: Порядок flush()

**Суть:** План предлагает вставить код копирования чеклиста «после копирования тегов (строка 66)» — это **до** `self.db.add(new_task)` (строка 68) и **до** `await self.db.flush()` (строка 69).

Хотя `new_task.id` доступен сразу (UUID генерируется клиентски через `default=lambda`), лучше вставлять код копирования **после** существующего `flush()` (строка 69). Тогда:
- new_task гарантированно сохранён в БД
- checklist_items ссылаются на существующую задачу
- flush чеклиста можно объединить с flush из `create_task_recurrence` (строка 225), избежав лишнего round-trip

**Исправление:** Вставить копирование чеклиста после строки 69 (`await self.db.flush()`), отдельный flush не нужен — `create_task_recurrence` сделает flush.

### 🟢 SUGGESTION #4: Import на уровне модуля

План показывает импорт внутри метода:
```python
from app.models.checklist import ChecklistItem
```

По конвенциям проекта (см. верх `recurrence_service.py`) импорты моделей — на уровне модуля.

### 🟡 WARNING #5: Тест — как отметить элементы выполненными

План пишет: «Отметить 2 элемента как выполненные (is_completed=True, completed_at=now)», но не уточняет **как** именно это сделать в тесте.

Через API это делается через `PATCH /api/tasks/{task_id}/checklist/{item_id}` с `{"is_completed": true}`. Нужно явно указать это в плане.

### 🟡 WARNING #6: Нет теста для catch_up_missed_tasks

Если исправляется и `catch_up_missed_tasks`, нужен тест, проверяющий что при catch-up генерации чеклист тоже копируется.

---

## Инверсия предположений

### Предположение 1
**План предполагает:** Только `generate_next_task` создаёт новые задачи.
**Инверсия:** `catch_up_missed_tasks` тоже создаёт задачи — и при старте сервера все пропущенные повторения будут без чеклиста.
**Влияние:** Пользователь увидит задачу без чеклиста после перезапуска сервера.
**Решение:** Покрыть оба метода.

### Предположение 2
**План предполагает:** Дублирование кода — нормально для такой маленькой правки.
**Инверсия:** При следующем добавлении поля (например, `priority`) разработчик забудет обновить оба места.
**Влияние:** Тихий баг — часть задач получит поле, часть нет.
**Решение:** Рефакторинг в общий метод `_create_task_from_template`.

### Предположение 3
**План предполагает:** `task.checklist_items` можно загрузить отдельным запросом внутри `generate_next_task`.
**Инверсия:** Если к моменту вызова `generate_next_task` сессия уже имеет грязные изменения, отдельный запрос может вернуть устаревшие данные.
**Влияние:** Низкое — перед вызовом всегда делается `flush()`.
**Решение:** Не критично, но стоит добавить `await self.db.flush()` перед загрузкой чеклиста для надёжности.

---

## Пропущенные сценарии

| Сценарий | Риск | Обработка |
|---|---|---|
| Задача с пустым чеклистом | 🟢 | Цикл `for item in items` просто не выполнится — ОК |
| Чеклист из 50+ элементов | 🟡 | Все создадутся в одной сессии — ОК, но можно batch insert |
| `catch_up_missed_tasks` создаёт 10 задач | 🔴 | Каждая без чеклиста, если не починить |
| Транзакция откатывается | 🟢 | cascade delete очистит checklist_items — ОК |
| Задача в корзине с чеклистом | 🟢 | `generate_next_task` уже отсекает trash — ОК |

---

## Вердикт

```
🟡 CONDITIONAL — исправить BLOCKER #1 (catch_up_missed_tasks), затем приступать
```

### Обновлённый план действий

1. Вынести `_create_task_from_template()` — общий метод с копированием тегов и чеклиста
2. Вынести `_copy_checklist_items()` — приватный метод загрузки и копирования
3. Обновить `generate_next_task()` — использовать `_create_task_from_template`
4. Обновить `catch_up_missed_tasks()` — использовать `_create_task_from_template`
5. Написать тесты для обоих путей
6. Запустить проверки
