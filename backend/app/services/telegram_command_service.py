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
                Task.is_completed.is_(False),
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
                Task.is_completed.is_(False),
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
