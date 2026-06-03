# Telegram Bot Commands — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Расширить Telegram-бота Todowka интерактивными командами: просмотр задач (сегодня, завтра, любая дата, входящие), добавление задач, быстрое добавление текстом, отметка выполнено.

**Architecture:** Расширяем существующий polling getUpdates в scheduler.py. Новый сервис TelegramCommandService обрабатывает команды и callback-кнопки. TelegramNotifierService дополняется методами для inline-кнопок. Каждый юзер использует своего бота — модель без изменений.

**Tech Stack:** Python 3.12+, httpx (уже есть), Telegram Bot API (HTTP), SQLAlchemy 2.0 async

**Constraints:**
- Telegram сообщение: max 4096 символов
- Telegram callback_data: max 64 байта
- Inline-кнопки: показывать max 20 задач
- Просроченные: показывать max 5 + «и ещё N»

---

### Task 1: i18n-ключи

**Files:**
- Modify: `backend/app/i18n/locales/ru.json`
- Modify: `backend/app/i18n/locales/en.json`

- [ ] **Step 1:** Добавить ключи в `ru.json` (после ключа `telegramBotConnected`):
```json
"telegramCmdToday": "📋 Задачи на сегодня",
"telegramCmdTomorrow": "📋 Задачи на завтра",
"telegramCmdDate": "📋 Задачи на {date}",
"telegramCmdInbox": "📥 Входящие",
"telegramNoTasks": "Нет задач",
"telegramOverdue": "⚠️ Просроченные",
"telegramMoreTasks": "...и ещё {count} задач",
"telegramAddSelectDate": "Выберите дату:",
"telegramAddNoDate": "Без даты",
"telegramAddTitle": "Введите название задачи:",
"telegramAddSuccess": "✅ Задача «{title}» создана",
"telegramQuickAdd": "✅ Добавлено во входящие: «{title}»",
"telegramTaskDone": "✅ Выполнено: «{title}»",
"telegramTaskAlreadyDone": "Уже выполнено",
"telegramAddError": "❌ Ошибка при создании задачи",
"telegramHelp": "🤖 Команды Todowka:\n\n/today — задачи на сегодня\n/tomorrow — задачи на завтра\n/date — задачи на дату\n/inbox — входящие\n/add — добавить задачу\n/help — помощь\n\nИли просто напишите текст — задача добавится во входящие."
```

- [ ] **Step 2:** Добавить ключи в `en.json` (после ключа `telegramBotConnected`):
```json
"telegramCmdToday": "📋 Tasks for today",
"telegramCmdTomorrow": "📋 Tasks for tomorrow",
"telegramCmdDate": "📋 Tasks for {date}",
"telegramCmdInbox": "📥 Inbox",
"telegramNoTasks": "No tasks",
"telegramOverdue": "⚠️ Overdue",
"telegramMoreTasks": "...and {count} more tasks",
"telegramAddSelectDate": "Select date:",
"telegramAddNoDate": "No date",
"telegramAddTitle": "Enter task title:",
"telegramAddSuccess": "✅ Task «{title}» created",
"telegramQuickAdd": "✅ Added to inbox: «{title}»",
"telegramTaskDone": "✅ Done: «{title}»",
"telegramTaskAlreadyDone": "Already done",
"telegramAddError": "❌ Error creating task",
"telegramHelp": "🤖 Todowka commands:\n\n/today — tasks for today\n/tomorrow — tasks for tomorrow\n/date — tasks for date\n/inbox — inbox\n/add — add task\n/help — help\n\nOr just type text — task will be added to inbox."
```

- [ ] **Step 3:** Commit
```bash
git add backend/app/i18n/locales/ru.json backend/app/i18n/locales/en.json
git commit -m "feat(i18n): add telegram bot command translations"
```

---

### Task 2: Расширить TelegramNotifierService — методы для inline-кнопок

**Files:**
- Modify: `backend/app/services/telegram_notifier.py`

- [ ] **Step 1:** Добавить 3 статических метода в класс `TelegramNotifierService` (перед методом `send_reminder`):

```python
@staticmethod
async def send_message_with_buttons(
    bot_token: str, chat_id: str, text: str, reply_markup: dict | None = None
) -> dict | None:
    url = TELEGRAM_API_BASE.format(token=bot_token, method="sendMessage")
    payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            data = resp.json()
            if not data.get("ok"):
                logger.warning(f"Telegram send_message_with_buttons failed: {data}")
                return None
            return data["result"]
    except httpx.HTTPError as e:
        logger.warning(f"Telegram send_message_with_buttons error: {e}")
        return None

@staticmethod
async def answer_callback_query(
    bot_token: str, callback_query_id: str, text: str = ""
) -> bool:
    url = TELEGRAM_API_BASE.format(token=bot_token, method="answerCallbackQuery")
    payload: dict = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    try:
        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            data = resp.json()
            if not data.get("ok"):
                logger.warning(f"Telegram answerCallbackQuery failed: {data}")
                return False
            return True
    except httpx.HTTPError as e:
        logger.warning(f"Telegram answerCallbackQuery error: {e}")
        return False

@staticmethod
async def edit_message_text(
    bot_token: str, chat_id: str, message_id: int, text: str,
    reply_markup: dict | None = None
) -> bool:
    url = TELEGRAM_API_BASE.format(token=bot_token, method="editMessageText")
    payload: dict = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            data = resp.json()
            if not data.get("ok"):
                logger.warning(f"Telegram editMessageText failed: {data}")
                return False
            return True
    except httpx.HTTPError as e:
        logger.warning(f"Telegram edit_message_text error: {e}")
        return False
```

- [ ] **Step 2:** Commit
```bash
git add backend/app/services/telegram_notifier.py
git commit -m "feat(telegram): add inline button methods to notifier"
```

---

### Task 3: Создать TelegramCommandService

**Files:**
- Create: `backend/app/services/telegram_command_service.py`

Это основной новый файл. Полная реализация:

```python
import logging
from calendar import monthcalendar
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.i18n import t as i18n_t
from app.models.task import GtdStatus, Task
from app.models.user import User
from app.schemas.task import TaskCreate
from app.services.task_service import TaskService
from app.services.telegram_notifier import TelegramNotifierService

logger = logging.getLogger(__name__)

MAX_TASKS_DISPLAY = 20
MAX_OVERDUE_DISPLAY = 5

_pending_adds: dict[str, dict] = {}
_pending_add_timeout = timedelta(minutes=5)

_MONTH_NAMES_RU = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
}

_MONTH_NAMES_EN = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
}


class TelegramCommandService:

    def _cleanup_expired_states(self):
        now = datetime.now(UTC)
        expired = [
            k for k, v in _pending_adds.items()
            if now - v.get("created_at", now) > _pending_add_timeout
        ]
        for k in expired:
            del _pending_adds[k]

    def _clear_user_state(self, chat_id: str):
        _pending_adds.pop(chat_id, None)

    @staticmethod
    def _month_name(month: int, lang: str) -> str:
        names = _MONTH_NAMES_RU if lang == "ru" else _MONTH_NAMES_EN
        return names.get(month, str(month))

    def _build_calendar_keyboard(
        self, year: int, month: int, prefix: str, lang: str = "ru"
    ) -> dict:
        weeks = monthcalendar(year, month)
        month_name = self._month_name(month, lang)
        header = [
            {"text": "◀️", "callback_data": f"{prefix}_nav:{year}:{month - 1}"},
            {"text": f"{month_name} {year}", "callback_data": "ignore"},
            {"text": "▶️", "callback_data": f"{prefix}_nav:{year}:{month + 1}"},
        ]

        day_names_ru = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        day_names_en = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
        day_names = day_names_ru if lang == "ru" else day_names_en
        day_header = [{"text": d, "callback_data": "ignore"} for d in day_names]

        buttons = [header, day_header]

        today = date.today()

        for week in weeks:
            row = []
            for day in week:
                if day == 0:
                    row.append({"text": " ", "callback_data": "ignore"})
                else:
                    cell_date = date(year, month, day)
                    if cell_date == today:
                        text = f"·{day}·"
                    else:
                        text = str(day)
                    row.append({
                        "text": text,
                        "callback_data": f"{prefix}:{year}:{month}:{day}",
                    })
            buttons.append(row)

        if prefix == "addcal":
            no_date_text = i18n_t("telegramAddNoDate", lang)
            buttons.append([{"text": no_date_text, "callback_data": f"{prefix}:nodate"}])

        return {"inline_keyboard": buttons}

    def _format_task_list(
        self,
        tasks: list[Task],
        title: str,
        user_tz: ZoneInfo,
        lang: str,
    ) -> tuple[str, dict | None]:
        if not tasks:
            text = f"{title}\n\n{i18n_t('telegramNoTasks', lang)}"
            return text, None

        lines = [title, ""]

        overdue_tasks = []
        dated_tasks = []
        now = datetime.now(user_tz)

        for task in tasks:
            if task.due_date:
                due_local = task.due_date
                if due_local.tzinfo is None:
                    due_local = due_local.replace(tzinfo=user_tz)
                else:
                    due_local = due_local.astimezone(user_tz)
                due_day = due_local.date()
                if due_day < now.date() and not task.is_completed:
                    overdue_tasks.append(task)
                    continue
            dated_tasks.append(task)

        if overdue_tasks:
            lines.append(i18n_t("telegramOverdue", lang))
            shown_overdue = overdue_tasks[:MAX_OVERDUE_DISPLAY]
            for task in shown_overdue:
                lines.append(self._format_task_line(task, user_tz))
            remaining_overdue = len(overdue_tasks) - MAX_OVERDUE_DISPLAY
            if remaining_overdue > 0:
                lines.append(i18n_t("telegramMoreTasks", lang, count=remaining_overdue))
            lines.append("")

        shown_dated = dated_tasks[:MAX_TASKS_DISPLAY]
        for task in shown_dated:
            lines.append(self._format_task_line(task, user_tz))
        remaining_dated = len(dated_tasks) - MAX_TASKS_DISPLAY
        if remaining_dated > 0:
            lines.append(i18n_t("telegramMoreTasks", lang, count=remaining_dated))

        total_for_buttons = overdue_tasks + dated_tasks
        shown_buttons = total_for_buttons[:MAX_TASKS_DISPLAY]

        keyboard = []
        for task in shown_buttons:
            if not task.is_completed:
                keyboard.append([{
                    "text": f"✓ {task.title}",
                    "callback_data": f"done:{task.id}",
                }])

        reply_markup = {"inline_keyboard": keyboard} if keyboard else None

        full_text = "\n".join(lines)
        if len(full_text) > 3800:
            full_text = full_text[:3800] + "\n..."

        return full_text, reply_markup

    @staticmethod
    def _format_task_line(task: Task, user_tz: ZoneInfo) -> str:
        line = f"• {task.title}"
        if task.due_date:
            due_local = task.due_date
            if due_local.tzinfo is None:
                due_local = due_local.replace(tzinfo=user_tz)
            else:
                due_local = due_local.astimezone(user_tz)
            if due_local.hour == 0 and due_local.minute == 0:
                line += f" ({due_local.strftime('%d.%m')})"
            else:
                line += f" ({due_local.strftime('%d.%m %H:%M')})"
        return line

    async def _get_tasks_for_date(
        self, db: AsyncSession, user_id: str, target_date: date, user_tz: ZoneInfo
    ) -> list[Task]:
        start = datetime.combine(target_date, time.min, tzinfo=user_tz)
        end = datetime.combine(target_date, time.max, tzinfo=user_tz)
        now = datetime.now(user_tz)
        today_start = datetime.combine(now.date(), time.min, tzinfo=user_tz)

        result = await db.execute(
            select(Task)
            .options(selectinload(Task.tags), selectinload(Task.project))
            .where(
                Task.user_id == user_id,
                Task.is_completed == False,
                Task.gtd_status != GtdStatus.TRASH.value,
                or_(
                    Task.due_date.between(start, end),
                    Task.due_date < today_start,
                ),
            )
            .order_by(Task.due_date)
            .limit(MAX_TASKS_DISPLAY + MAX_OVERDUE_DISPLAY + 10)
        )
        return list(result.scalars().all())

    async def _get_inbox_tasks(
        self, db: AsyncSession, user_id: str
    ) -> list[Task]:
        result = await db.execute(
            select(Task)
            .options(selectinload(Task.tags), selectinload(Task.project))
            .where(
                Task.user_id == user_id,
                Task.gtd_status == GtdStatus.INBOX.value,
                Task.is_completed == False,
            )
            .order_by(Task.created_at.desc())
            .limit(MAX_TASKS_DISPLAY + 10)
        )
        return list(result.scalars().all())

    async def _create_task(
        self,
        db: AsyncSession,
        user: User,
        title: str,
        due_date: datetime | None,
        lang: str,
    ) -> None:
        bot_token = user.decrypted_telegram_bot_token
        chat_id = user.telegram_chat_id

        try:
            title = title[:255]

            if due_date:
                gtd_status = GtdStatus.ACTIVE
            else:
                gtd_status = GtdStatus.INBOX

            task_service = TaskService(db)
            task_data = TaskCreate(
                title=title,
                gtd_status=gtd_status,
                due_date=due_date,
            )
            task = await task_service.create_task(user.id, task_data)
            await db.flush()

            await TelegramNotifierService.send_message(
                bot_token, chat_id,
                i18n_t("telegramAddSuccess", lang, title=title),
            )

            from app.event_bus import event_bus
            await event_bus.publish(f"{user.id}:sync", "task_updated", {
                "task_id": str(task.id),
                "action": "created",
            })
        except Exception as e:
            logger.error(f"Telegram create_task error for user {user.id}: {e}")
            await TelegramNotifierService.send_message(
                bot_token, chat_id,
                i18n_t("telegramAddError", lang),
            )

    async def handle_command(
        self, user: User, command: str, db: AsyncSession
    ) -> None:
        self._cleanup_expired_states()

        chat_id = user.telegram_chat_id
        self._clear_user_state(chat_id)

        bot_token = user.decrypted_telegram_bot_token
        lang = getattr(user, "language", None) or "ru"
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        if command == "/today":
            today = datetime.now(user_tz).date()
            tasks = await self._get_tasks_for_date(db, user.id, today, user_tz)
            title = i18n_t("telegramCmdToday", lang)
            text, markup = self._format_task_list(tasks, title, user_tz, lang)
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id, text, markup
            )

        elif command == "/tomorrow":
            tomorrow = datetime.now(user_tz).date() + timedelta(days=1)
            tasks = await self._get_tasks_for_date(db, user.id, tomorrow, user_tz)
            title = i18n_t("telegramCmdTomorrow", lang)
            text, markup = self._format_task_list(tasks, title, user_tz, lang)
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id, text, markup
            )

        elif command == "/date":
            kb = self._build_calendar_keyboard(
                datetime.now(user_tz).year,
                datetime.now(user_tz).month,
                "cal",
                lang,
            )
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id,
                i18n_t("telegramAddSelectDate", lang),
                kb,
            )

        elif command == "/inbox":
            tasks = await self._get_inbox_tasks(db, user.id)
            title = i18n_t("telegramCmdInbox", lang)
            text, markup = self._format_task_list(tasks, title, user_tz, lang)
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id, text, markup
            )

        elif command == "/add":
            _pending_adds[chat_id] = {
                "step": "calendar",
                "selected_date": None,
                "created_at": datetime.now(UTC),
            }
            kb = self._build_calendar_keyboard(
                datetime.now(user_tz).year,
                datetime.now(user_tz).month,
                "addcal",
                lang,
            )
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id,
                i18n_t("telegramAddSelectDate", lang),
                kb,
            )

        elif command == "/help":
            await TelegramNotifierService.send_message(
                bot_token, chat_id, i18n_t("telegramHelp", lang)
            )

    async def handle_callback(
        self, user: User, callback_query: dict, db: AsyncSession
    ) -> None:
        self._cleanup_expired_states()

        bot_token = user.decrypted_telegram_bot_token
        chat_id = user.telegram_chat_id
        lang = getattr(user, "language", None) or "ru"
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        cq_id = callback_query["id"]
        data = callback_query.get("data", "")
        message = callback_query.get("message", {})
        message_id = message.get("message_id")

        if data == "ignore":
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
            return

        if data.startswith("cal_nav:"):
            parts = data.split(":")
            year, month = int(parts[1]), int(parts[2])
            if month < 1:
                month = 12
                year -= 1
            elif month > 12:
                month = 1
                year += 1
            kb = self._build_calendar_keyboard(year, month, "cal", lang)
            await TelegramNotifierService.edit_message_text(
                bot_token, chat_id, message_id,
                i18n_t("telegramAddSelectDate", lang), kb,
            )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data.startswith("addcal_nav:"):
            parts = data.split(":")
            year, month = int(parts[1]), int(parts[2])
            if month < 1:
                month = 12
                year -= 1
            elif month > 12:
                month = 1
                year += 1
            kb = self._build_calendar_keyboard(year, month, "addcal", lang)
            await TelegramNotifierService.edit_message_text(
                bot_token, chat_id, message_id,
                i18n_t("telegramAddSelectDate", lang), kb,
            )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data.startswith("cal:") and not data.startswith("cal_nav:"):
            parts = data.split(":")
            year, month, day = int(parts[1]), int(parts[2]), int(parts[3])
            target = date(year, month, day)
            tasks = await self._get_tasks_for_date(db, user.id, target, user_tz)
            date_str = target.strftime("%d.%m.%Y")
            title = i18n_t("telegramCmdDate", lang, date=date_str)
            text, markup = self._format_task_list(tasks, title, user_tz, lang)
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id, text, markup
            )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data.startswith("addcal:") and not data.startswith("addcal_nav:"):
            if data == "addcal:nodate":
                _pending_adds[chat_id] = {
                    "step": "waiting_title",
                    "selected_date": None,
                    "created_at": datetime.now(UTC),
                }
            else:
                parts = data.split(":")
                year, month, day = int(parts[1]), int(parts[2]), int(parts[3])
                _pending_adds[chat_id] = {
                    "step": "waiting_title",
                    "selected_date": date(year, month, day),
                    "created_at": datetime.now(UTC),
                }
            await TelegramNotifierService.send_message(
                bot_token, chat_id, i18n_t("telegramAddTitle", lang)
            )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data.startswith("done:"):
            task_id = data.split(":")[1]
            await self._complete_task(
                user, task_id, cq_id, db, lang
            )

    async def handle_text(
        self, user: User, text: str, db: AsyncSession
    ) -> None:
        self._cleanup_expired_states()

        chat_id = user.telegram_chat_id
        lang = getattr(user, "language", None) or "ru"
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        state = _pending_adds.get(chat_id)
        if state and state.get("step") == "waiting_title":
            selected_date = state.get("selected_date")
            due_date = None
            if selected_date:
                due_date = datetime.combine(
                    selected_date, time.min, tzinfo=user_tz
                )

            del _pending_adds[chat_id]
            await self._create_task(db, user, text, due_date, lang)
            return

        await self._create_task(db, user, text, None, lang)

    async def _complete_task(
        self,
        user: User,
        task_id: str,
        cq_id: str,
        db: AsyncSession,
        lang: str,
    ) -> None:
        bot_token = user.decrypted_telegram_bot_token
        chat_id = user.telegram_chat_id

        task_service = TaskService(db)
        task = await task_service.get_task(user.id, task_id)

        if not task:
            await TelegramNotifierService.answer_callback_query(
                bot_token, cq_id, i18n_t("telegramNoTasks", lang)
            )
            return

        if task.is_completed:
            await TelegramNotifierService.answer_callback_query(
                bot_token, cq_id, i18n_t("telegramTaskAlreadyDone", lang)
            )
            return

        task_title = task.title
        await task_service.move_task(user.id, task.id, GtdStatus.COMPLETED, user=user)

        await TelegramNotifierService.answer_callback_query(
            bot_token, cq_id, i18n_t("telegramTaskDone", lang, title=task_title)
        )

        from app.event_bus import event_bus
        await event_bus.publish(f"{user.id}:sync", "task_updated", {
            "task_id": str(task.id),
            "action": "completed",
        })
```

- [ ] **Step 2:** Commit
```bash
git add backend/app/services/telegram_command_service.py
git commit -m "feat(telegram): add command service with calendar, task list, add/complete"
```

---

### Task 4: Расширить polling в scheduler.py

**Files:**
- Modify: `backend/app/scheduler.py`

- [ ] **Step 1:** Изменить запрос в `_do_poll_telegram_bots()` — убрать фильтр `User.telegram_chat_id.is_(None)` чтобы опрашивать всех юзеров с ботом.

Заменить (строки ~630-634):
```python
result = await session.execute(
    select(User).where(
        User.telegram_bot_token.isnot(None),
        User.telegram_bot_token != '',
        User.telegram_chat_id.is_(None),
    )
)
```
На:
```python
result = await session.execute(
    select(User).where(
        User.telegram_bot_token.isnot(None),
        User.telegram_bot_token != '',
    )
)
```

- [ ] **Step 2:** Заменить цикл обработки updates (строки ~649-668). Заменить:
```python
for upd in updates:
    message = upd.get("message", {})
    text = message.get("text", "").strip()
    chat_id = str(message.get("chat", {}).get("id", ""))

    if text == "/start" and chat_id:
        user.telegram_chat_id = chat_id
        user.telegram_notifications_enabled = True
        await session.commit()
        logger.info(
            f"Telegram chat_id {chat_id} linked for user {user.username}"
        )

        lang = getattr(user, 'language', None) or "ru"
        await TelegramNotifierService.send_message(
            bot_token,
            chat_id,
            i18n_t("telegramBotConnected", lang),
        )
        break
```

На:
```python
from app.services.telegram_command_service import TelegramCommandService

cmd_service = TelegramCommandService()

for upd in updates:
    callback_query = upd.get("callback_query")
    if callback_query:
        if user.telegram_chat_id:
            await cmd_service.handle_callback(user, callback_query, session)
            await session.commit()
        continue

    message = upd.get("message", {})
    text = message.get("text", "").strip()
    chat_id = str(message.get("chat", {}).get("id", ""))

    if not text or not chat_id:
        continue

    if text == "/start":
        if not user.telegram_chat_id:
            user.telegram_chat_id = chat_id
            user.telegram_notifications_enabled = True
            await session.commit()
            logger.info(
                f"Telegram chat_id {chat_id} linked for user {user.username}"
            )
            lang = getattr(user, 'language', None) or "ru"
            await TelegramNotifierService.send_message(
                bot_token,
                chat_id,
                i18n_t("telegramBotConnected", lang),
            )
        else:
            lang = getattr(user, 'language', None) or "ru"
            await TelegramNotifierService.send_message(
                bot_token,
                chat_id,
                i18n_t("telegramHelp", lang),
            )
        continue

    if not user.telegram_chat_id or chat_id != user.telegram_chat_id:
        continue

    if text.startswith("/"):
        command = text.split()[0]
        await cmd_service.handle_command(user, command, session)
        await session.commit()
    else:
        await cmd_service.handle_text(user, text, session)
        await session.commit()
```

- [ ] **Step 3:** Commit
```bash
git add backend/app/scheduler.py
git commit -m "feat(telegram): extend polling to handle commands and callbacks"
```

---

### Task 5: Тесты

**Files:**
- Create: `backend/tests/test_telegram_command_service.py`

- [ ] **Step 1:** Создать файл тестов:

```python
import pytest
from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

from app.services.telegram_command_service import (
    MAX_OVERDUE_DISPLAY,
    MAX_TASKS_DISPLAY,
    TelegramCommandService,
    _pending_adds,
)


@pytest.fixture
def cmd_service():
    return TelegramCommandService()


@pytest.fixture(autouse=True)
def clear_pending():
    _pending_adds.clear()
    yield
    _pending_adds.clear()


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = "test-user-id"
    user.telegram_chat_id = "12345"
    user.telegram_bot_token = "encrypted"
    user.decrypted_telegram_bot_token = "123456:ABC"
    user.timezone = "Europe/Moscow"
    user.language = "ru"
    return user


def _make_task(task_id="t1", title="Task", due_date=None, is_completed=False):
    task = MagicMock()
    task.id = task_id
    task.title = title
    task.due_date = due_date
    task.is_completed = is_completed
    return task


class TestCalendarKeyboard:
    def test_navigation_prev_next(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "cal")
        nav = kb["inline_keyboard"][0]
        assert nav[0]["callback_data"] == "cal_nav:2026:5"
        assert nav[2]["callback_data"] == "cal_nav:2026:7"

    def test_add_prefix_has_nodate_button(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "addcal")
        last = kb["inline_keyboard"][-1]
        assert last[0]["callback_data"] == "addcal:nodate"

    def test_cal_prefix_no_nodate_button(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "cal")
        for row in kb["inline_keyboard"]:
            for btn in row:
                assert "nodate" not in btn["callback_data"]

    def test_day_buttons_have_correct_callback(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "cal")
        found = False
        for row in kb["inline_keyboard"][2:]:
            for btn in row:
                if btn["callback_data"].startswith("cal:2026:6:"):
                    found = True
        assert found

    def test_month_wrap_backward(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 1, "cal")
        assert kb["inline_keyboard"][0][0]["callback_data"] == "cal_nav:2025:12"

    def test_month_wrap_forward(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 12, "cal")
        assert kb["inline_keyboard"][0][2]["callback_data"] == "cal_nav:2027:1"

    def test_today_marked_with_dots(self, cmd_service):
        today = date.today()
        kb = cmd_service._build_calendar_keyboard(today.year, today.month, "cal")
        for row in kb["inline_keyboard"][2:]:
            for btn in row:
                if btn["callback_data"].endswith(f":{today.day}"):
                    assert btn["text"].startswith("·")
                    assert btn["text"].endswith("·")
                    return
        pytest.skip("Today not in calendar range")


class TestFormatTaskList:
    def test_empty_returns_no_tasks_text(self, cmd_service):
        text, markup = cmd_service._format_task_list(
            [], "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert "Нет задач" in text
        assert markup is None

    def test_task_with_due_date(self, cmd_service):
        task = _make_task(due_date=datetime(2026, 6, 15, tzinfo=ZoneInfo("Europe/Moscow")))
        text, markup = cmd_service._format_task_list(
            [task], "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert "15.06" in text
        assert markup is not None

    def test_completed_task_no_button(self, cmd_service):
        task = _make_task(is_completed=True)
        text, markup = cmd_service._format_task_list(
            [task], "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert markup is None

    def test_max_tasks_limit(self, cmd_service):
        tasks = [_make_task(task_id=f"t{i}", title=f"Task {i}") for i in range(30)]
        text, markup = cmd_service._format_task_list(
            tasks, "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert len(markup["inline_keyboard"]) <= MAX_TASKS_DISPLAY

    def test_text_truncated_at_3800(self, cmd_service):
        tasks = [_make_task(task_id=f"t{i}", title="A" * 200) for i in range(30)]
        text, _ = cmd_service._format_task_list(
            tasks, "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert len(text) <= 4096

    def test_overdue_shown_separately(self, cmd_service):
        yesterday = datetime(2020, 1, 1, tzinfo=ZoneInfo("Europe/Moscow"))
        overdue = _make_task(task_id="od1", title="Old", due_date=yesterday)
        today_task = _make_task(task_id="td1", title="Today")
        text, markup = cmd_service._format_task_list(
            [overdue, today_task], "Title", ZoneInfo("UTC"), "ru"
        )
        assert "Просроченные" in text


class TestCleanupExpiredStates:
    def test_removes_expired(self, cmd_service):
        _pending_adds["old"] = {
            "step": "waiting_title",
            "selected_date": None,
            "created_at": datetime.now(UTC) - timedelta(minutes=10),
        }
        cmd_service._cleanup_expired_states()
        assert "old" not in _pending_adds

    def test_keeps_fresh(self, cmd_service):
        _pending_adds["fresh"] = {
            "step": "waiting_title",
            "selected_date": date(2026, 6, 15),
            "created_at": datetime.now(UTC),
        }
        cmd_service._cleanup_expired_states()
        assert "fresh" in _pending_adds


class TestHandleCommand:
    @pytest.mark.asyncio
    async def test_help_sends_message(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message = AsyncMock()
            await cmd_service.handle_command(mock_user, "/help", AsyncMock())
            mock_ns.send_message.assert_called_once()
            call_text = mock_ns.send_message.call_args[0][2]
            assert "/today" in call_text

    @pytest.mark.asyncio
    async def test_command_clears_pending_state(self, cmd_service, mock_user):
        _pending_adds[mock_user.telegram_chat_id] = {
            "step": "waiting_title",
            "selected_date": date(2026, 6, 15),
            "created_at": datetime.now(UTC),
        }
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message = AsyncMock()
            await cmd_service.handle_command(mock_user, "/help", AsyncMock())
        assert mock_user.telegram_chat_id not in _pending_adds

    @pytest.mark.asyncio
    async def test_add_sets_pending_state(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message_with_buttons = AsyncMock()
            await cmd_service.handle_command(mock_user, "/add", AsyncMock())
        state = _pending_adds.get(mock_user.telegram_chat_id)
        assert state is not None
        assert state["step"] == "calendar"


class TestHandleText:
    @pytest.mark.asyncio
    async def test_quick_add_creates_inbox_task(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TaskService"
        ) as mock_ts_cls:
            mock_ts = AsyncMock()
            mock_ts.create_task = AsyncMock(return_value=MagicMock(id="new-task"))
            mock_ts_cls.return_value = mock_ts

            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.send_message = AsyncMock()
                with patch("app.services.telegram_command_service.event_bus") as mock_eb:
                    mock_eb.publish = AsyncMock()
                    await cmd_service.handle_text(
                        mock_user, "Купить молоко", AsyncMock()
                    )

            mock_ts.create_task.assert_called_once()
            call_data = mock_ts.create_task.call_args[0][1]
            assert call_data.gtd_status.value == "inbox"
            assert call_data.due_date is None

    @pytest.mark.asyncio
    async def test_pending_add_with_date_creates_active_task(self, cmd_service, mock_user):
        _pending_adds[mock_user.telegram_chat_id] = {
            "step": "waiting_title",
            "selected_date": date(2026, 6, 15),
            "created_at": datetime.now(UTC),
        }
        with patch(
            "app.services.telegram_command_service.TaskService"
        ) as mock_ts_cls:
            mock_ts = AsyncMock()
            mock_ts.create_task = AsyncMock(return_value=MagicMock(id="new-task"))
            mock_ts_cls.return_value = mock_ts

            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.send_message = AsyncMock()
                with patch("app.services.telegram_command_service.event_bus") as mock_eb:
                    mock_eb.publish = AsyncMock()
                    await cmd_service.handle_text(
                        mock_user, "Купить молоко", AsyncMock()
                    )

            mock_ts.create_task.assert_called_once()
            call_data = mock_ts.create_task.call_args[0][1]
            assert call_data.gtd_status.value == "active"
            assert call_data.due_date is not None


class TestHandleCallback:
    @pytest.mark.asyncio
    async def test_ignore_callback(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.answer_callback_query = AsyncMock()
            await cmd_service.handle_callback(
                mock_user,
                {"id": "cq1", "data": "ignore", "message": {}},
                AsyncMock(),
            )
            mock_ns.answer_callback_query.assert_called_once()

    @pytest.mark.asyncio
    async def test_done_callback_calls_complete(self, cmd_service, mock_user):
        with patch.object(cmd_service, "_complete_task", new_callable=AsyncMock) as mock_complete:
            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.answer_callback_query = AsyncMock()
                await cmd_service.handle_callback(
                    mock_user,
                    {"id": "cq1", "data": "done:task-123", "message": {"message_id": 42}},
                    AsyncMock(),
                )
            mock_complete.assert_called_once()
            assert mock_complete.call_args[0][1] == "task-123"
```

- [ ] **Step 2:** Запустить тесты
```bash
cd backend && pytest tests/test_telegram_command_service.py -v
```

- [ ] **Step 3:** Commit
```bash
git add backend/tests/test_telegram_command_service.py
git commit -m "test(telegram): add tests for command service"
```

---

### Task 6: Обновить features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1:** Добавить запись о командах Telegram-бота в соответствующую категорию

- [ ] **Step 2:** Commit
```bash
git add docs/features.md
git commit -m "docs: add telegram bot commands to features"
```

---

### Финальная проверка

```bash
cd backend && ruff check . && pytest tests/ -v
```
