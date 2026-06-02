# Telegram /add — улучшения календаря и полный флоу добавления

**Дата:** 2026-06-02
**Статус:** Plan

## Цель

Улучшить UX команды `/add` в Telegram боте:
1. Quick-кнопки "Сегодня" / "Завтра" вверху календаря
2. Календарь исчезает после выбора даты
3. Выбор области и проекта после ввода названия
4. Кнопка "Отмена" на каждом шаге
5. Итоговое сообщение с деталями созданной задачи

## Полный флоу

```
Шаг 1: Календарь
┌─────────────────────────────┐
│ [📅 Сегодня] [📅 Завтра]    │  ← quick-кнопки (НОВОЕ)
│ [◀️ Июнь 2026 ▶️]           │
│ [Пн Вт Ср Чт Пт Сб Вс]     │
│ [ 1  2  3  4  5  6  7]      │
│ ...                          │
│ [Без даты]                   │  ← уже есть
└─────────────────────────────┘
       ↓ выбор даты → календарь исчезает (НОВОЕ)

Шаг 2: Ввод названия
"Введите название задачи:"
(текст вводится пользователем)
       ↓

Шаг 3: Выбор области (НОВОЕ)
┌─────────────────────────────┐
│ "Выберите область:"         │
│ [🏠 Работа]                  │
│ [🏠 Личное]                  │
│ [⏭️ Пропустить]              │
│ [❌ Отмена]                   │
└─────────────────────────────┘
       ↓ если 0 областей → шаг пропускается

Шаг 4: Выбор проекта (НОВОЕ)
┌─────────────────────────────┐
│ "Выберите проект:"          │
│ [📁 Проект А]                │
│ [📁 Проект Б]                │
│ [⏭️ Пропустить]              │
│ [❌ Отмена]                   │
└─────────────────────────────┘
       ↓ если 0 проектов → шаг пропускается

Шаг 5: Итоговое сообщение (НОВОЕ)
✅ Задача «Название» создана
📂 Область: Работа
📁 Проект: Проект А
📅 Дата: 03.06.2026
```

## State machine

`_pending_adds` расширяется:

```python
# Шаг 1 (календарь)
{"step": "calendar", "selected_date": None, "created_at": ...}

# Шаг 2 (ввод названия) — после выбора даты
{"step": "waiting_title", "selected_date": date, "created_at": ...}

# Шаг 3 (выбор области) — после ввода названия
{"step": "select_area", "selected_date": date, "title": "...", "created_at": ...}

# Шаг 4 (выбор проекта) — после выбора области/пропуска
{"step": "select_project", "selected_date": date, "title": "...", "area_id": "...", "created_at": ...}
```

## Callback data

| Callback | Действие |
|----------|----------|
| `addcal:today` | today date → календарь исчезает → waiting_title |
| `addcal:tomorrow` | tomorrow date → календарь исчезает → waiting_title |
| `addcal:Y:M:D` | date → календарь исчезает → waiting_title |
| `addcal:nodate` | no date → календарь исчезает → waiting_title |
| `addcancel` | очистить state, отправить "Отменено" |
| `addarea:skip` | area=None → select_project |
| `addarea:<id>` | area_id → select_project |
| `addproj:skip` | project=None → создать задачу |
| `addproj:<id>` | project_id → создать задачу |

## Изменения

### 1. i18n — новые ключи (ru.json, en.json, tt.json)

| Ключ | ru | en | tt |
|------|----|----|-----|
| `telegramAddToday` | 📅 Сегодня | 📅 Today | 📅 Бүген |
| `telegramAddTomorrow` | 📅 Завтра | 📅 Tomorrow | 📅 Иртәгә |
| `telegramAddCancel` | ❌ Отмена | ❌ Cancel | ❌ Баш тарту |
| `telegramAddCancelled` | ❌ Добавление задачи отменено | ❌ Task creation cancelled | ❌ Бурыч өстәүдән баш тартылды |
| `telegramAddSelectArea` | Выберите область: | Select area: | Өлкә сайлагыз: |
| `telegramAddSelectProject` | Выберите проект: | Select project: | Проект сайлагыз: |
| `telegramAddSkip` | ⏭️ Пропустить | ⏭️ Skip | ⏭️ Уздырып җибәрү |
| `telegramAddSummary` | ✅ Задача «{title}» создана | ✅ Task «{title}» created | ✅ «{title}» бурычы булдырылды |
| `telegramAddArea` | 📂 Область: {name} | 📂 Area: {name} | 📂 Өлкә: {name} |
| `telegramAddProject` | 📁 Проект: {name} | 📁 Project: {name} | 📁 Проект: {name} |
| `telegramAddDate` | 📅 Дата: {date} | 📅 Date: {date} | 📅 Дата: {date} |

### 2. `_build_calendar_keyboard` (строка 58)

Вставить ряд quick-кнопок **перед** header, только при `prefix == "addcal"`:

```python
if prefix == "addcal":
    buttons.insert(0, [
        {"text": i18n_t("telegramAddToday", lang), "callback_data": "addcal:today"},
        {"text": i18n_t("telegramAddTomorrow", lang), "callback_data": "addcal:tomorrow"},
    ])
```

Структура кнопок:
```
[📅 Сегодня] [📅 Завтра]       ← НОВОЕ
[◀️ Июнь 2026 ▶️]              ← header
[Пн Вт Ср Чт Пт Сб Вс]        ← day_header
[... дни месяца ...]           ← weeks
[Без даты]                     ← no_date (уже есть)
```

### 3. `handle_callback` — обработка addcal (строка 428)

Рефакторинг: единая обработка всех вариантов выбора даты:

```python
if data == "addcal:nodate":
    selected_date = None
elif data == "addcal:today":
    selected_date = datetime.now(user_tz).date()
elif data == "addcal:tomorrow":
    selected_date = datetime.now(user_tz).date() + timedelta(days=1)
else:
    parts = data.split(":")
    selected_date = date(int(parts[1]), int(parts[2]), int(parts[3]))
```

**Убрать календарь** — `edit_message_text` с `reply_markup=None`:
```python
if selected_date:
    date_str = selected_date.strftime("%d.%m.%Y")
else:
    date_str = i18n_t("telegramAddNoDate", lang)
await TelegramNotifierService.edit_message_text(
    bot_token, chat_id, message_id, date_str, None
)
```

### 4. `handle_callback` — новые обработчики

**`addcancel`:** очистить state, отправить "Отменено"
```python
elif data == "addcancel":
    self._clear_user_state(chat_id)
    await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
    await TelegramNotifierService.send_message(
        bot_token, chat_id, i18n_t("telegramAddCancelled", lang)
    )
```

**`addarea:skip`:** area=None → select_project (или сразу создать если 0 проектов)
**`addarea:<id>`:** area_id → select_project (или сразу создать)

**`addproj:skip`:** project=None → создать задачу
**`addproj:<id>`:** project_id → создать задачу

### 5. `handle_text` — после ввода названия (строка 467)

Вместо мгновенного создания задачи — переход к выбору области:

```python
state = _pending_adds.get(chat_id)
if state and state.get("step") == "waiting_title":
    title = text[:255]
    # Запросить области из БД
    areas = await self._get_user_areas(db, user.id)
    if areas:
        _pending_adds[chat_id] = {
            "step": "select_area",
            "selected_date": state["selected_date"],
            "title": title,
            "created_at": datetime.now(UTC),
        }
        # Отправить кнопки выбора области + Пропустить + Отмена
        await self._send_area_selection(bot_token, chat_id, areas, lang)
    else:
        # 0 областей → попробовать проекты
        projects = await self._get_user_projects(db, user.id)
        if projects:
            _pending_adds[chat_id] = {
                "step": "select_project",
                "selected_date": state["selected_date"],
                "title": title,
                "area_id": None,
                "created_at": datetime.now(UTC),
            }
            await self._send_project_selection(bot_token, chat_id, projects, lang)
        else:
            # 0 областей и 0 проектов → создать сразу
            del _pending_adds[chat_id]
            await self._create_task(db, user, title, due_date, lang)
    return
```

### 6. `_create_task` — расширить сигнатуру (строка 223)

Добавить параметры `area_id` и `project_id`:

```python
async def _create_task(self, db, user, title, due_date, lang,
                       area_id=None, project_id=None):
    task_data = TaskCreate(
        title=title, gtd_status=gtd_status,
        due_date=due_date, area_id=area_id, project_id=project_id,
    )
```

Итоговое сообщение — собирается из частей:
```python
lines = [i18n_t("telegramAddSummary", lang, title=title)]
if area_name:
    lines.append(i18n_t("telegramAddArea", lang, name=area_name))
if project_name:
    lines.append(i18n_t("telegramAddProject", lang, name=project_name))
if due_date:
    lines.append(i18n_t("telegramAddDate", lang, date=due_date.strftime("%d.%m.%Y")))
await TelegramNotifierService.send_message(bot_token, chat_id, "\n".join(lines))
```

### 7. Новые вспомогательные методы

```python
async def _get_user_areas(self, db, user_id) -> list[Area]:
    result = await db.execute(
        select(Area).where(Area.user_id == user_id).order_by(Area.sort_order)
    )
    return list(result.scalars().all())

async def _get_user_projects(self, db, user_id) -> list[Project]:
    result = await db.execute(
        select(Project).where(Project.user_id == user_id, Project.is_active == True)
        .order_by(Project.sort_order)
    )
    return list(result.scalars().all())

async def _send_area_selection(self, bot_token, chat_id, areas, lang):
    keyboard = []
    for area in areas:
        keyboard.append([{"text": area.name, "callback_data": f"addarea:{area.id}"}])
    keyboard.append([{"text": i18n_t("telegramAddSkip", lang), "callback_data": "addarea:skip"}])
    keyboard.append([{"text": i18n_t("telegramAddCancel", lang), "callback_data": "addcancel"}])
    await TelegramNotifierService.send_message_with_buttons(
        bot_token, chat_id,
        i18n_t("telegramAddSelectArea", lang),
        {"inline_keyboard": keyboard},
    )

async def _send_project_selection(self, bot_token, chat_id, projects, lang):
    keyboard = []
    for project in projects:
        keyboard.append([{"text": project.name, "callback_data": f"addproj:{project.id}"}])
    keyboard.append([{"text": i18n_t("telegramAddSkip", lang), "callback_data": "addproj:skip"}])
    keyboard.append([{"text": i18n_t("telegramAddCancel", lang), "callback_data": "addcancel"}])
    await TelegramNotifierService.send_message_with_buttons(
        bot_token, chat_id,
        i18n_t("telegramAddSelectProject", lang),
        {"inline_keyboard": keyboard},
    )
```

## Auto-skip логика

- 0 областей → шаг `select_area` пропускается
- 0 проектов → шаг `select_project` пропускается
- 0 областей И 0 проектов → задача создаётся сразу после ввода названия (как сейчас для quick add)

## Файлы

- `backend/app/services/telegram_command_service.py` — основная логика
- `backend/app/i18n/locales/ru.json` — i18n ключи
- `backend/app/i18n/locales/en.json` — i18n ключи
- `backend/app/i18n/locales/tt.json` — i18n ключи

## Без изменений

- `telegram_notifier.py` — `edit_message_text` уже поддерживает `reply_markup=None`
- `docs/features.md` — обновить после реализации
- Миграции БД — не нужны
