# Telegram Bot — 4 новые возможности

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить 4 новые возможности в Telegram-бот: Smart Parse, Daily Digest, Reply Actions, /stats.

**Architecture:** Расширяем существующие сервисы `telegram_command_service.py` и `telegram_notifier.py`. Новые сервисы: `telegram_smart_parser.py`, `message_task_mapper.py`. Polling-модель без изменений.

**Tech Stack:** Python 3.12+, httpx, Telegram Bot API (HTTP), SQLAlchemy 2.0 async, regex

**Constraints:**
- Telegram сообщение: max 4096 символов
- Telegram callback_data: max 64 байта
- Inline-кнопки: показывать max 20 задач
- MessageTaskMapper: module-level singleton, thread-safe, TTL 7 дней

**Порядок обработки входящего текста (критично):**
1. Reply на сообщение бота? → Reply Actions
2. Команда (/xxx)? → handle_command
3. Обычный текст? → Smart Parse → quick add с распознанными полями

---

### Task 0: i18n-ключи

**Files:**
- Modify: `backend/app/i18n/locales/ru.json`
- Modify: `backend/app/i18n/locales/en.json`

- [ ] **Step 1:** Добавить ключи для Smart Parse подтверждений:
```json
"telegramSmartCreated": "✅ Задача создана: \"{title}\"",
"telegramSmartDate": "📅 {date}",
"telegramSmartTags": "🏷 {tags}",
"telegramSmartContext": "📍 {context}",
```

- [ ] **Step 2:** Добавить ключи для Reply Actions подтверждений:
```json
"telegramReplyDone": "✅ Задача \"{title}\" → выполнена",
"telegramReplyTomorrow": "📅 Задача \"{title}\" → перенесена на завтра",
"telegramReplyToday": "📅 Задача \"{title}\" → перенесена на сегодня",
"telegramReplyDeleted": "🗑️ Задача \"{title}\" → удалена",
"telegramReplyInbox": "📥 Задача \"{title}\" → во входящих",
```

- [ ] **Step 3:** Добавить ключи для /stats:
```json
"telegramStatsTitle": "📊 Твоя статистика ({period})",
"telegramStatsWeek": "7 дней",
"telegramStatsMonth": "30 дней",
"telegramStatsCompleted": "Выполнено",
"telegramStatsTasks": "задач",
"telegramStatsStreak": "дней подряд",
"telegramStatsTopProjects": "🏆 Топ проектов",
"telegramStatsNoData": "Пока нет данных",
"telegramStatsWeekBtn": "📅 За неделю",
"telegramStatsMonthBtn": "📅 За месяц",
```

- [ ] **Step 4:** Добавить ключи для Daily Digest:
```json
"telegramDigestMorning": "☀️ Доброе утро!",
"telegramDigestToday": "📋 Сегодня: {count} задач",
"telegramDigestOverdue": "⚠️ Просрочено: {count}",
"telegramDigestInbox": "📥 Во входящих: {count}",
"telegramDigestAllTasks": "📋 Все задачи",
"telegramDigestInboxBtn": "📥 Входящие",
"telegramDigestNoTasks": "На сегодня задач нет. Отличный день!",
```

- [ ] **Step 5:** Обновить `/help` — добавить `/stats` в список команд:
```json
"telegramHelp": "... \n/stats — статистика продуктивности\n..."
```

---

### Task 1: Infrastructure — send_message возвращает message_id

**Files:**
- Modify: `backend/app/services/telegram_notifier.py`

**Проблема:** `send_message` возвращает `bool`, а для Reply Actions нужен `message_id`. `send_message_with_buttons` уже возвращает `dict | None`.

- [ ] **Step 1:** Изменить сигнатуру `send_message` с `-> bool` на `-> dict | None`:
```python
@staticmethod
async def send_message(bot_token: str, chat_id: str, text: str) -> dict | None:
    # ... existing code ...
    if not data.get("ok"):
        return None
    return data["result"]  # содержит message_id
```

- [ ] **Step 2:** Обновить ВСЕ вызовы `send_message`, которые проверяют `bool`:
- В `_job_send_deadline_notifications` (`scheduler.py:471`) — `if not success` → `if result is None` не нужен, просто вызов
- В `_send_task_summary` (`telegram_command_service.py:312`) — вызов без проверки
- В `_create_task` (`telegram_command_service.py:281`) — error handler
- В `_job_reminder_recovery` (`scheduler.py:205`) — `success = await ...` → без проверки
- В `send_reminder` (`telegram_notifier.py:266`) — `success = await ...` → проверить
- Все остальные вызовы `send_message` в проекте — найти через grep и обновить

**Совместимость:** `dict | None` truthy/falsy работает как `bool` в `if` проверках, но нужно обновить явные сравнения с `True`/`False`.

---

### Task 2: Smart Parse — создать парсер

**Files:**
- Create: `backend/app/services/telegram_smart_parser.py`

**Scope (Phase 1 — только даты, время, теги):**
- Дата: сегодня, завтра, день недели, число+месяц, через N дней/недель, на следующей неделе
- Время: в HH:MM
- Тег: #word
- ~~Контекст~~ — убрано (Task model не имеет удобного API для поиска контекста по имени в существующем коде; добавить в Phase 2)
- ~~Приоритет~~ — убрано (Task model не имеет поля `priority`; нужна миграция — вынести в отдельную задачу)

- [ ] **Step 1:** Создать dataclass `ParsedTask`:
```python
@dataclass
class ParsedTask:
    title: str
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    tags: list[str] = field(default_factory=list)
```

- [ ] **Step 2:** Создать класс `SmartTaskParser` с методом `parse(text: str, locale: str = "ru") -> ParsedTask`
- Regex-паттерны (ru/en) со строгими word boundaries:
  - Даты: `\bсегодня\b`/`\btoday\b`, `\bзавтра\b`/`\btomorrow\b`
  - День недели: `\bв\s+(понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)\b` — строгий whitelist
  - Число+месяц: `\b(\d{1,2})\s+(января|февраля|...|декабря)\b`
  - Относительная дата: `\bчерез\s+(\d+)\s+(день|дня|дней|неделю|недели|недель)\b`
  - На следующей неделе: `\bна следующей неделе\b` / `\bnext week\b`
  - Время: `\bв?\s*(\d{1,2}:\d{2})\b` — только с двоеточием, "в 5" НЕ распознаётся как время
  - Тег: `#([\wа-яА-ЯёЁ]+)` — Unicode-aware
- Каждый паттерн извлекается и вырезается из текста
- Остаток после удаления всех паттернов = title (`.strip()`)
- Если title пустой — вернуть исходный текст как title
- Если ничего не распознано — title = исходный текст, остальные поля None/[]

- [ ] **Step 3:** Юнит-тесты:
```python
"позвонить Ивану завтра в 15:00 #work"
  → title="позвонить Ивану", due_date=завтра, due_time=15:00, tags=["work"]
"купить молоко #products"
  → title="купить молоко", tags=["products"]
"подготовить отчёт в пятницу"
  → title="подготовить отчёт", due_date=ближайшая_пятница
"купить билеты через 2 дня"
  → title="купить билеты", due_date=сегодня+2
"в магазине #errands"
  → title="в магазине", tags=["errands"]  ("в" не у дня недели — не дата)
"просто текст"
  → title="просто текст" (fallback, tags=[], due_date=None)
```

---

### Task 3: Smart Parse — интеграция в бота

**Files:**
- Modify: `backend/app/services/telegram_command_service.py`

- [ ] **Step 1:** В `handle_text` (строка 732), ПОСЛЕ проверки `_pending_adds` и ДО `_create_task`:
  - Импортировать `SmartTaskParser`
  - Вызвать `SmartTaskParser.parse(text, user_locale)`
  - Если `parsed.due_date` — создать задачу с `due_date` вместо inbox (GTD status = ACTIVE)
  - Если `parsed.due_time` и есть `due_date` — скомбинировать в `datetime` с `user_tz`
  - Если `parsed.tags` — для каждого тега: найти в БД по имени, если нет — создать через TagService, привязать к задаче
- [ ] **Step 2:** Обновить `_send_task_summary` — показывать распознанные поля:
```
✅ Задача создана: "Позвонить Ивану"
📅 Завтра, 15:00 | #work
```
- [ ] **Step 3:** Обновить `_create_task` — принимать опциональные `tag_names: list[str]` и привязывать теги после создания задачи
- [ ] **Step 4:** Интеграционные тесты quick add с Smart Parse

---

### Task 4: Reply Actions — MessageTaskMapper

**Files:**
- Create: `backend/app/services/message_task_mapper.py`

**Архитектурное решение:** Module-level singleton (как `_pending_adds` в `telegram_command_service.py`), чтобы сохранять состояние между poll cycles. Thread-safe (polling работает в отдельном потоке).

- [ ] **Step 1:** Создать module-level singleton:
```python
import threading
from datetime import UTC, datetime, timedelta
from typing import Optional

_TTL = timedelta(days=7)
_store: dict[str, tuple[int, datetime]] = {}
_lock = threading.Lock()


def store(bot_token: str, chat_id: str, message_id: int, task_id: int) -> None:
    key = f"{bot_token}:{chat_id}:{message_id}"
    with _lock:
        _store[key] = (task_id, datetime.now(UTC))


def get(bot_token: str, chat_id: str, message_id: int) -> Optional[int]:
    key = f"{bot_token}:{chat_id}:{message_id}"
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        task_id, created_at = entry
        if datetime.now(UTC) - created_at > _TTL:
            del _store[key]
            return None
        return task_id


def cleanup() -> None:
    with _lock:
        now = datetime.now(UTC)
        expired = [k for k, (_, ts) in _store.items() if now - ts > _TTL]
        for k in expired:
            del _store[k]
```

- [ ] **Step 2:** Юнит-тесты: store/get, TTL истёк, cleanup, thread-safety, неизвестный ключ

---

### Task 5: Reply Actions — запись message_id

**Files:**
- Modify: `backend/app/services/telegram_notifier.py`
- Modify: `backend/app/services/telegram_command_service.py`

**Проблема:** Нужно знать `message_id` отправленного сообщения для маппинга. После Task 1 `send_message` возвращает `dict | None` с `message_id`.

- [ ] **Step 1:** В `_send_task_summary` (`telegram_command_service.py:286`):
  - Заменить `await TelegramNotifierService.send_message(...)` на `result = await TelegramNotifierService.send_message(...)`
  - Если `result` содержит `message_id` — вызвать `message_task_mapper.store(bot_token, chat_id, result["message_id"], task.id)`
  - Для этого `_send_task_summary` должен принимать `task_id` (или объект task) — обновить сигнатуру

- [ ] **Step 2:** В `_format_task_list` — при отправке списка задач через `send_message_with_buttons`:
  - Результат уже содержит `message_id`
  - Записать mapper для каждой задачи в списке? НЕТ — слишком много записей
  - Альтернатива: записывать mapper только для single-task сообщений (quick add summary, reminders)
  - Inline-кнопки (done:task_id) уже обрабатывают completion через callback — mapper не нужен для списков

- [ ] **Step 3:** В `send_reminder` (`telegram_notifier.py:255`):
  - После отправки — записать mapper для reminder сообщений
  - Пользователь сможет reply "done" на напоминание

---

### Task 6: Reply Actions — обработка reply

**Files:**
- Modify: `backend/app/services/telegram_command_service.py`
- Modify: `backend/app/scheduler.py` (в `_do_poll_telegram_bots`)

**Критично: precedence** — reply check ДО Smart Parse и ДО command handling. Это значит проверка reply должна быть в `_do_poll_telegram_bots` до вызова `handle_text`.

- [ ] **Step 1:** В `_do_poll_telegram_bots` (`scheduler.py`), в ветке `else` (обычный текст, строка 697-699):
  - ДО вызова `handle_text` — проверить `message.get("reply_to_message")`
  - Если reply есть — извлечь `reply_to_message["message_id"]`
  - Вызвать `message_task_mapper.get(bot_token, chat_id, reply_message_id)`
  - Если найден task_id — вызвать `cmd_service.handle_reply(user, task_id, text, session)`
  - Если НЕ найден — продолжить обычный flow (`handle_text`)

- [ ] **Step 2:** Добавить метод `handle_reply` в `TelegramCommandService`:

```python
async def handle_reply(
    self, user: User, task_id: int, text: str, db: AsyncSession
) -> None:
    bot_token = user.decrypted_telegram_bot_token
    chat_id = user.telegram_chat_id
    lang = getattr(user, "language", None) or "ru"

    text_lower = text.strip().lower()

    action = None
    if text_lower in ("done", "готово", "✅", "v", "д"):
        action = "done"
    elif text_lower == "завтра":
        action = "tomorrow"
    elif text_lower == "сегодня":
        action = "today"
    elif text_lower in ("удалить", "delete", "del", "дель"):
        action = "delete"
    elif text_lower == "inbox":
        action = "inbox"

    if action is None:
        return  # неизвестная команда reply — игнорировать

    task_service = TaskService(db)
    task = await task_service.get_task(user.id, str(task_id))
    if not task:
        return  # задача не найдена — молча игнорировать

    if action == "done":
        if not task.is_completed:
            await task_service.move_task(user.id, task.id, GtdStatus.COMPLETED, user=user)
        confirmation = i18n_t("telegramReplyDone", lang, title=task.title)
    elif action == "tomorrow":
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        tomorrow = datetime.now(user_tz).date() + timedelta(days=1)
        task.due_date = datetime.combine(tomorrow, time.max, tzinfo=user_tz)
        confirmation = i18n_t("telegramReplyTomorrow", lang, title=task.title)
    elif action == "today":
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        today = datetime.now(user_tz).date()
        task.due_date = datetime.combine(today, time.max, tzinfo=user_tz)
        confirmation = i18n_t("telegramReplyToday", lang, title=task.title)
    elif action == "delete":
        await task_service.move_task(user.id, task.id, GtdStatus.TRASH, user=user)
        confirmation = i18n_t("telegramReplyDeleted", lang, title=task.title)
    elif action == "inbox":
        await task_service.move_task(user.id, task.id, GtdStatus.INBOX, user=user)
        confirmation = i18n_t("telegramReplyInbox", lang, title=task.title)

    await db.flush()

    # SSE sync — как в _complete_task
    from app.event_bus import event_bus
    await event_bus.publish(f"{user.id}:sync", "task_updated", {
        "task_id": str(task.id),
        "action": action,
    })

    await TelegramNotifierService.send_message(bot_token, chat_id, confirmation)
```

- [ ] **Step 3:** Тесты reply commands: done, завтра, сегодня, удалить, inbox, неизвестная команда, задача не найдена, reply на неизвестное сообщение

---

### Task 7: /stats — мини-статистика

**Files:**
- Modify: `backend/app/services/telegram_command_service.py`

**Данные:** Существующий `/api/stats` (`backend/app/api/stats.py`) даёт completed_week/completed_month/created_week/created_month. Нужны ДОПОЛНИТЕЛЬНО:

- [ ] **Step 1:** Streak запрос — дни подряд с >=1 выполненной задачей:
```sql
SELECT DATE(completed_at) as day
FROM tasks
WHERE user_id = :user_id
  AND is_completed = true
  AND completed_at >= DATE('now', '-60 days')
GROUP BY DATE(completed_at)
ORDER BY day DESC
```
Затем в Python: итерировать дни с сегодняшнего назад, считать последовательные.

- [ ] **Step 2:** Топ-3 проекта:
```sql
SELECT p.name, COUNT(*) as cnt
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.user_id = :user_id
  AND t.is_completed = true
  AND t.completed_at >= :period_start
GROUP BY p.name
ORDER BY cnt DESC
LIMIT 3
```

- [ ] **Step 3:** Добавить метод `_format_stats` в `TelegramCommandService`:
```
📊 Твоя статистика (7 дней)

Выполнено: ████████░░ 12/15 задач
🔥 Streak: 5 дней подряд

🏆 Топ проектов:
  1. Работа — 18
  2. Личное — 12
  3. Учёба — 8

[📅 За неделю] [📅 За месяц]
```
- Эмодзи-бар: 10 сегментов, `█` заполненных, `░` пустых
- Если нет данных: "Пока нет данных"

- [ ] **Step 4:** Обработчик команды `/stats` — по умолчанию за неделю
- [ ] **Step 5:** Callback `stats:week` / `stats:month` — перегенерировать через `edit_message_text`
- [ ] **Step 6:** Тесты форматирования + callback-переключение + пустые данные

---

### Task 8: Daily Digest — миграция и настройки

**Files:**
- Modify: `backend/app/models/user.py`
- Create: Alembic миграция
- Modify: `backend/app/schemas/` (Pydantic схема)

**Решение:** Поля прямо на User model (как telegram_chat_id, timezone и др.)

- [ ] **Step 1:** Добавить поля в `User` (`backend/app/models/user.py`):
```python
from sqlalchemy import Time as TimeType
# ...
digest_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default='0', nullable=False)
digest_time: Mapped[time | None] = mapped_column(TimeType, nullable=True)
digest_last_sent: Mapped[date | None] = mapped_column(Date, nullable=True)
```
- `digest_time` — `None` означает "не настроено", но enabled=False по умолчанию
- `digest_last_sent` — дата последней отправки (защита от дублей)

- [ ] **Step 2:** Pydantic-схема `DigestSettings`:
```python
class DigestSettings(BaseModel):
    enabled: bool = False
    time: str = "08:00"  # HH:MM
```

- [ ] **Step 3:** Alembic миграция: `alembic revision --autogenerate -m "add_digest_settings"`

---

### Task 9: Daily Digest — API настроек

**Files:**
- Modify: `backend/app/api/users.py` (или settings.py — где находится профиль пользователя)

- [ ] **Step 1:** Эндпоинт `GET /api/users/me/digest` — текущие настройки
- [ ] **Step 2:** Эндпоинт `PUT /api/users/me/digest` — обновить настройки
  - Валидация: `time` в формате `HH:MM`, 00:00–23:59
  - Если `enabled=True` — проверить что `telegram_bot_token` и `telegram_chat_id` заполнены
- [ ] **Step 3:** Тесты API

---

### Task 10: Daily Digest — scheduler job

**Files:**
- Modify: `backend/app/scheduler.py`
- Modify: `backend/app/services/telegram_notifier.py`

- [ ] **Step 1:** Scheduler job `send_daily_digests` — каждую минуту в `TaskScheduler.startup()`:
```python
self.scheduler.add_job(
    _job_send_daily_digests,
    'interval',
    minutes=1,
    id='send_daily_digests',
    replace_existing=True,
    max_instances=1,
)
```

- [ ] **Step 2:** Логика `_job_send_daily_digests`:
  - Найти пользователей с `digest_enabled=True`
  - Для каждого:
    - Вычислить текущее время в их таймзоне: `datetime.now(ZoneInfo(user.timezone)).strftime('%H:%M')`
    - Если `user.digest_time.strftime('%H:%M') != текущее_время` — skip
    - Если `user.digest_last_sent == date.today()` — skip (уже отправляли)
    - Получить задачи на сегодня (`_get_tasks_for_date`), просроченные, inbox count
    - Отправить digest через `TelegramNotifierService`
    - Обновить `user.digest_last_sent = date.today()`

- [ ] **Step 3:** Метод `format_daily_digest` в `TelegramNotifierService`:
```
☀️ Доброе утро!

📋 Сегодня: 5 задач
  • Подготовить отчёт (18:00)
  • Позвонить Ивану
  • ...

⚠️ Просрочено: 3
📥 Во входящих: 7

[📋 Все задачи] [📥 Входящие]
```
- Inline-кнопки: callback `action:today` / `action:inbox`
- Если задач нет: "На сегодня задач нет. Отличный день!"

- [ ] **Step 4:** Callback `action:today` и `action:inbox` в `handle_callback` — выполнить `/today` или `/inbox`
- [ ] **Step 5:** Тесты: scheduler job логика, форматирование, отправка, защита от дублей, timezone/DST

---

### Task 11: Документация и финализация

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1:** Добавить 4 новые возможности в `docs/features.md` в раздел Telegram
- [ ] **Step 2:** Запустить проверки:
```bash
cd backend && ruff check .
cd backend && pytest tests/ -v
```

---

### Зависимости между задачами

```
Task 0 (i18n) — без него ничего не работает
Task 1 (send_message refactor) ──→ Task 5 (запись message_id)

Task 2 (Smart Parse parser) ──→ Task 3 (Smart Parse интеграция)
Task 4 (MessageTaskMapper) ──→ Task 5 (запись) ──→ Task 6 (обработка reply)
Task 7 (/stats) — независим
Task 8 (Digest миграция) ──→ Task 9 (Digest API) ──→ Task 10 (Digest scheduler)
Task 11 (Документация) — после всех
```

**Параллелизация:**
- Поток A: Task 0 → Task 1 → Task 4 → Task 5 → Task 6
- Поток B: Task 0 → Task 2 → Task 3
- Поток C: Task 0 → Task 7
- Поток D: Task 0 → Task 8 → Task 9 → Task 10
- Task 11 — финальный

**Рекомендуемый порядок:** Task 0 → Task 1 → Task 2-3 (параллельно с 4-5-6) → Task 7 → Task 8-9-10 → Task 11

---

### Что убрано из scope (Phase 2)

- **Контекст (@word)** — Task model не имеет удобного поиска по имени, добавить позже
- **Приоритет (!/!!)** — Task model не имеет поля `priority`, нужна отдельная миграция + UI в веб-приложении
- **Voice-to-Task** — требует внешний API (Whisper), сложнее, отложено
