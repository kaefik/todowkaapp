# Копирование checklist_items при повторении задачи

**Дата:** 2026-05-14

## Проблема

При генерации следующей повторяющейся задачи не копируются элементы чеклиста (`checklist_items`). Это затрагивает **два** метода в `RecurrenceService`:

1. `generate_next_task()` — при завершении задачи пользователем
2. `catch_up_missed_tasks()` — при старте сервера для пропущенных повторений

Дополнительно: если элементы чеклиста были отмечены как выполненные, при копировании нужно сбросить их статус выполнения.

## Анализ текущего состояния

### Дублирование кода создания задачи

`generate_next_task` (строки 48-63) и `catch_up_missed_tasks` (строки 292-308) содержат практически идентичный код создания `Task` с копированием одинакового набора полей. Добавление копирования чеклиста в оба места увеличит дублирование и создаст риск забыть обновить оба места при добавлении новых полей.

### Модель ChecklistItem (backend/app/models/checklist.py)

| Поле | Тип | Поведение при копировании |
|---|---|---|
| `id` | UUID | Новый UUID |
| `task_id` | FK | ID новой задачи |
| `title` | String | Копировать |
| `is_completed` | Boolean | **Сбросить в False** |
| `position` | Integer | Копировать |
| `completed_at` | DateTime | **Сбросить в None** |
| `created_at` | DateTime | Авто-генерация |
| `updated_at` | DateTime | Авто-генерация |

### Технический нюанс

`get_task()` (task_service.py:117-124) загружает через `selectinload` только `tags`, `project`, `context`. `checklist_items` не загружаются. Поэтому чеклист нужно загружать отдельным запросом.

## План реализации

### Шаг 1. Рефакторинг `backend/app/services/recurrence_service.py`

#### 1.1. Добавить импорт на уровне модуля

```python
from app.models.checklist import ChecklistItem
```

#### 1.2. Создать приватный метод `_copy_checklist_items()`

После существующего `create_task_recurrence()`:

```python
async def _copy_checklist_items(self, source_task: Task, target_task: Task) -> None:
    stmt = select(ChecklistItem).where(ChecklistItem.task_id == source_task.id).order_by(ChecklistItem.position)
    result = await self.db.execute(stmt)
    items = result.scalars().all()

    for item in items:
        new_item = ChecklistItem(
            task_id=target_task.id,
            title=item.title,
            position=item.position,
            is_completed=False,
            completed_at=None,
        )
        self.db.add(new_item)

    if items:
        await self.db.flush()
```

#### 1.3. Создать приватный метод `_create_task_from_template()`

Вынести общую логику создания задачи из `generate_next_task` и `catch_up_missed_tasks`:

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

#### 1.4. Обновить `generate_next_task()` (строки 48-69)

Заменить блок создания Task (строки 48-69) на:

```python
new_task = await self._create_task_from_template(task, next_due_date, new_status)

await self.create_task_recurrence(task, new_task, next_due_date)

return new_task
```

#### 1.5. Обновить `catch_up_missed_tasks()` (строки 292-314)

Заменить блок создания Task (строки 292-314) на:

```python
fallback_status = task.gtd_status if task.gtd_status not in ('completed', 'trash') else 'next'

new_task = await self._create_task_from_template(task, next_date, fallback_status)

await self.create_task_recurrence(task, new_task, next_date)
generated_tasks.append(new_task)
```

### Шаг 2. Написать тесты в `backend/tests/test_recurrence.py`

#### Тест 1: `test_new_task_copies_checklist_items`
- Создать задачу с чеклистом из 3 элементов через `POST /api/tasks/{task_id}/checklist`
- Завершить задачу (toggle)
- Получить чеклист новой задачи через `GET /api/tasks/{new_task_id}/checklist`
- Проверить: 3 элемента с теми же `title` и `position`

#### Тест 2: `test_new_task_resets_checklist_items_completion`
- Создать задачу с чеклистом из 3 элементов
- Отметить 2 элемента как выполненные через `PATCH /api/tasks/{task_id}/checklist/{item_id}` с `{"is_completed": true}`
- Завершить задачу (toggle)
- Получить чеклист новой задачи
- Проверить: все 3 элемента имеют `is_completed=False` и `completed_at=None`

#### Тест 3: `test_task_without_checklist_generates_without_error`
- Создать задачу с повторением, но без чеклиста
- Завершить задачу (toggle)
- Проверить: новая задача создана корректно, без ошибок

### Шаг 3. Запустить проверки

```bash
cd backend
pytest tests/test_recurrence.py -v
ruff check .
```

## Файлы для изменения

1. `backend/app/services/recurrence_service.py` — рефакторинг + копирование чеклиста
2. `backend/tests/test_recurrence.py` — 3 новых теста
3. `docs/features.md` — обновить документацию
