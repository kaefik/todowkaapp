import json
import logging
from calendar import monthcalendar
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.i18n import t as i18n_t
from app.models.area import Area
from app.models.project import Project
from app.models.tag import Tag
from app.models.task import GtdStatus, Task
from app.models.user import User
from app.schemas.task import TaskCreate
from app.services.task_service import TaskService
from app.services.telegram_notifier import TelegramNotifierService
from app.services.telegram_smart_parser import parse as smart_parse

logger = logging.getLogger(__name__)

MAX_TASKS_DISPLAY = 20
MAX_OVERDUE_DISPLAY = 5
MAX_SEARCH_DISPLAY = 10

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

        quick_row = [
            {"text": i18n_t("telegramAddToday", lang), "callback_data": f"{prefix}:today"},
            {"text": i18n_t("telegramAddTomorrow", lang), "callback_data": f"{prefix}:tomorrow"},
        ]
        buttons.insert(0, quick_row)

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
            buttons.append([{"text": i18n_t("telegramAddCancel", lang), "callback_data": "addcancel"}])

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
                    due_local = due_local.replace(tzinfo=UTC).astimezone(user_tz)
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

        if keyboard:
            keyboard.append([{
                "text": "✕",
                "callback_data": "dismiss",
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
                due_local = due_local.replace(tzinfo=UTC).astimezone(user_tz)
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

    async def _get_search_tasks(
        self, db: AsyncSession, user_id: str, query: str
    ) -> list[Task]:
        from sqlalchemy import or_

        like_pattern = f"%{query}%"
        result = await db.execute(
            select(Task)
            .options(selectinload(Task.tags), selectinload(Task.project))
            .where(
                Task.user_id == user_id,
                Task.is_completed.is_(False),
                Task.gtd_status != GtdStatus.TRASH.value,
                or_(
                    Task.title.ilike(like_pattern),
                    Task.description.ilike(like_pattern),
                ),
            )
            .order_by(Task.due_date.asc().nulls_last(), Task.created_at.desc())
            .limit(MAX_SEARCH_DISPLAY + 1)
        )
        return list(result.scalars().all())

    def _format_search_results(
        self,
        tasks: list[Task],
        query: str,
        user_tz: ZoneInfo,
        lang: str,
    ) -> tuple[str, dict | None]:
        title = i18n_t("telegramSearchTitle", lang, query=query)

        if not tasks:
            return f"{title}\n\n{i18n_t('telegramSearchNoResults', lang)}", None

        gtd_status_map = {
            "inbox": i18n_t("gtdInbox", lang),
            "active": i18n_t("gtdActive", lang),
            "next": i18n_t("gtdNext", lang),
            "waiting": i18n_t("gtdWaiting", lang),
            "someday": i18n_t("gtdSomeday", lang),
        }

        lines = [title, ""]
        shown = tasks[:MAX_SEARCH_DISPLAY]

        for task in shown:
            status_text = gtd_status_map.get(task.gtd_status, "")
            line = f"• {task.title}"
            if status_text:
                line += f" [{status_text}]"
            if task.due_date:
                due_local = task.due_date
                if due_local.tzinfo is None:
                    due_local = due_local.replace(tzinfo=UTC).astimezone(user_tz)
                else:
                    due_local = due_local.astimezone(user_tz)
                if due_local.hour == 0 and due_local.minute == 0:
                    line += f" ({due_local.strftime('%d.%m')})"
                else:
                    line += f" ({due_local.strftime('%d.%m %H:%M')})"
            lines.append(line)

        remaining = len(tasks) - MAX_SEARCH_DISPLAY
        if remaining > 0:
            lines.append(i18n_t("telegramSearchMore", lang, count=remaining))

        keyboard = []
        for task in shown:
            if not task.is_completed:
                keyboard.append([{
                    "text": f"✓ {task.title}",
                    "callback_data": f"done:{task.id}",
                }])
        if keyboard:
            keyboard.append([{
                "text": "✕",
                "callback_data": "dismiss",
            }])
        reply_markup = {"inline_keyboard": keyboard} if keyboard else None

        full_text = "\n".join(lines)
        if len(full_text) > 3800:
            full_text = full_text[:3800] + "\n..."
        return full_text, reply_markup

    async def _resolve_tag_ids(
        self, db: AsyncSession, user_id: str, tag_names: list[str]
    ) -> list[str]:
        tag_ids = []
        for name in tag_names:
            result = await db.execute(
                select(Tag).where(Tag.user_id == user_id, Tag.name == name)
            )
            tag = result.scalar_one_or_none()
            if tag:
                tag_ids.append(str(tag.id))
            else:
                from app.schemas.tag import TagCreate
                from app.services.tag_service import TagService
                tag_service = TagService(db)
                new_tag = await tag_service.create_tag(
                    user_id, TagCreate(name=name)
                )
                tag_ids.append(str(new_tag.id))
        return tag_ids

    async def _create_task(
        self,
        db: AsyncSession,
        user: User,
        title: str,
        due_date: datetime | None,
        lang: str,
        area_id: str | None = None,
        project_id: str | None = None,
        tag_names: list[str] | None = None,
    ) -> None:
        bot_token = user.decrypted_telegram_bot_token
        chat_id = user.telegram_chat_id
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        try:
            title = title[:255]

            if due_date:
                gtd_status = GtdStatus.ACTIVE
            else:
                gtd_status = GtdStatus.INBOX

            tag_ids = None
            if tag_names:
                tag_ids = await self._resolve_tag_ids(db, user.id, tag_names)

            task_service = TaskService(db)
            task_data = TaskCreate(
                title=title,
                gtd_status=gtd_status,
                due_date=due_date,
                area_id=area_id,
                project_id=project_id,
                tag_ids=tag_ids,
            )
            task = await task_service.create_task(user.id, task_data)
            await db.flush()

            await self._send_task_summary(
                db, bot_token, chat_id, title, due_date, lang,
                area_id=area_id, project_id=project_id,
                tag_names=tag_names, task_id=str(task.id),
                user_tz=user_tz,
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

    async def _send_task_summary(
        self,
        db: AsyncSession,
        bot_token: str,
        chat_id: str,
        title: str,
        due_date: datetime | None,
        lang: str,
        area_id: str | None = None,
        project_id: str | None = None,
        tag_names: list[str] | None = None,
        task_id: str | None = None,
        user_tz: ZoneInfo | None = None,
    ) -> None:
        lines = [i18n_t("telegramAddSummary", lang, title=title)]

        if area_id:
            area = await db.get(Area, area_id)
            if area:
                lines.append(i18n_t("telegramAddAreaLabel", lang, name=area.name))

        if project_id:
            project = await db.get(Project, project_id)
            if project:
                lines.append(i18n_t("telegramAddProjectLabel", lang, name=project.name))

        if due_date:
            local_due = due_date
            if local_due.tzinfo is None:
                local_due = local_due.replace(tzinfo=UTC)
            if user_tz:
                local_due = local_due.astimezone(user_tz)
            is_sentinel = local_due.hour == 23 and local_due.minute == 59
            if is_sentinel or (local_due.hour == 0 and local_due.minute == 0):
                date_str = local_due.strftime("%d.%m.%Y")
            else:
                date_str = local_due.strftime("%d.%m.%Y %H:%M")
            lines.append(i18n_t("telegramAddDateLabel", lang, date=date_str))
        else:
            lines.append(i18n_t("telegramAddInboxLabel", lang))

        if tag_names:
            lines.append(i18n_t("telegramSmartTags", lang, tags=", ".join(f"#{t}" for t in tag_names)))

        result = await TelegramNotifierService.send_message(
            bot_token, chat_id, "\n".join(lines),
        )

        if result and task_id and result.get("message_id"):
            from app.services import message_task_mapper
            message_task_mapper.store(
                bot_token, chat_id, result["message_id"], task_id
            )

    async def _get_user_areas(
        self, db: AsyncSession, user_id: str
    ) -> list[Area]:
        result = await db.execute(
            select(Area)
            .where(Area.user_id == user_id)
            .order_by(Area.sort_order)
        )
        return list(result.scalars().all())

    async def _get_user_projects(
        self, db: AsyncSession, user_id: str
    ) -> list[Project]:
        result = await db.execute(
            select(Project)
            .where(Project.user_id == user_id, Project.is_active.is_(True))
            .order_by(Project.sort_order)
        )
        return list(result.scalars().all())

    async def _send_area_selection(
        self, bot_token: str, chat_id: str, areas: list[Area], lang: str,
    ) -> None:
        keyboard = []
        for area in areas:
            keyboard.append([{
                "text": area.name,
                "callback_data": f"addarea:{area.id}",
            }])
        keyboard.append([{
            "text": i18n_t("telegramAddSkip", lang),
            "callback_data": "addarea:skip",
        }])
        keyboard.append([{
            "text": i18n_t("telegramAddCancel", lang),
            "callback_data": "addcancel",
        }])
        await TelegramNotifierService.send_message_with_buttons(
            bot_token, chat_id,
            i18n_t("telegramAddSelectArea", lang),
            {"inline_keyboard": keyboard},
        )

    async def _send_project_selection(
        self, bot_token: str, chat_id: str, projects: list[Project], lang: str,
    ) -> None:
        keyboard = []
        for project in projects:
            keyboard.append([{
                "text": project.name,
                "callback_data": f"addproj:{project.id}",
            }])
        keyboard.append([{
            "text": i18n_t("telegramAddSkip", lang),
            "callback_data": "addproj:skip",
        }])
        keyboard.append([{
            "text": i18n_t("telegramAddCancel", lang),
            "callback_data": "addcancel",
        }])
        await TelegramNotifierService.send_message_with_buttons(
            bot_token, chat_id,
            i18n_t("telegramAddSelectProject", lang),
            {"inline_keyboard": keyboard},
        )

    async def _proceed_after_area(
        self,
        db: AsyncSession,
        user: User,
        chat_id: str,
        state: dict,
        lang: str,
    ) -> None:
        bot_token = user.decrypted_telegram_bot_token
        projects = await self._get_user_projects(db, user.id)

        if projects:
            _pending_adds[chat_id] = {
                "step": "select_project",
                "selected_date": state.get("selected_date"),
                "title": state.get("title"),
                "area_id": state.get("area_id"),
                "created_at": state.get("created_at", datetime.now(UTC)),
            }
            await self._send_project_selection(bot_token, chat_id, projects, lang)
        else:
            selected_date = state.get("selected_date")
            due_date = None
            if selected_date:
                user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
                due_date = datetime.combine(selected_date, time.max, tzinfo=user_tz).astimezone(UTC)
            del _pending_adds[chat_id]
            await self._create_task(
                db, user, state["title"], due_date, lang,
                area_id=state.get("area_id"),
                project_id=None,
            )

    async def _proceed_after_title(
        self,
        db: AsyncSession,
        user: User,
        chat_id: str,
        title: str,
        selected_date: date | None,
        lang: str,
    ) -> None:
        bot_token = user.decrypted_telegram_bot_token
        areas = await self._get_user_areas(db, user.id)

        if areas:
            _pending_adds[chat_id] = {
                "step": "select_area",
                "selected_date": selected_date,
                "title": title,
                "created_at": datetime.now(UTC),
            }
            await self._send_area_selection(bot_token, chat_id, areas, lang)
        else:
            projects = await self._get_user_projects(db, user.id)
            if projects:
                _pending_adds[chat_id] = {
                    "step": "select_project",
                    "selected_date": selected_date,
                    "title": title,
                    "area_id": None,
                    "created_at": datetime.now(UTC),
                }
                await self._send_project_selection(bot_token, chat_id, projects, lang)
            else:
                user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
                due_date = None
                if selected_date:
                    due_date = datetime.combine(selected_date, time.max, tzinfo=user_tz).astimezone(UTC)
                await self._create_task(db, user, title, due_date, lang)

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

        elif command in ("/help", "?"):
            await TelegramNotifierService.send_message(
                bot_token, chat_id, i18n_t("telegramHelp", lang)
            )

        elif command == "/export":
            from app.services.export_import_service import ExportImportService

            try:
                export_service = ExportImportService(db)
                data = await export_service.export_data(user_id=user.id)
                json_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
                today_str = datetime.now(user_tz).strftime("%Y-%m-%d")
                filename = f"todowka_export_{today_str}.json"
                caption = i18n_t("telegramExportSuccess", lang, date=today_str)
                success = await TelegramNotifierService.send_document(
                    bot_token, chat_id, filename, json_bytes, caption
                )
                if not success:
                    await TelegramNotifierService.send_message(
                        bot_token, chat_id, i18n_t("telegramExportError", lang)
                    )
            except Exception as e:
                logger.error(f"Telegram export error for user {user.id}: {e}")
                await TelegramNotifierService.send_message(
                    bot_token, chat_id, i18n_t("telegramExportError", lang)
                )

        elif command == "/stats":
            await self._send_stats(db, user, bot_token, chat_id, lang, "week")

        elif command in ("/search", "/s"):
            await self._send_search_prompt(bot_token, chat_id, lang)

        elif command.startswith("/search ") or command.startswith("/s "):
            query = command.split(" ", 1)[1].strip()
            if query:
                tasks = await self._get_search_tasks(db, user.id, query)
                text, markup = self._format_search_results(
                    tasks, query, user_tz, lang
                )
                await TelegramNotifierService.send_message_with_buttons(
                    bot_token, chat_id, text, markup
                )
            else:
                await self._send_search_prompt(bot_token, chat_id, lang)

        elif command == "/menu":
            keyboard = self._build_main_keyboard(lang)
            await TelegramNotifierService.send_reply_keyboard(
                bot_token, chat_id,
                i18n_t("telegramHelp", lang),
                keyboard,
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
            if data == "cal:today":
                target = datetime.now(user_tz).date()
            elif data == "cal:tomorrow":
                target = datetime.now(user_tz).date() + timedelta(days=1)
            else:
                parts = data.split(":")
                target = date(int(parts[1]), int(parts[2]), int(parts[3]))

            if message_id:
                await TelegramNotifierService.edit_message_text(
                    bot_token, chat_id, message_id,
                    target.strftime("%d.%m.%Y"),
                    {"inline_keyboard": []},
                )
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
                selected_date = None
            elif data == "addcal:today":
                selected_date = datetime.now(user_tz).date()
            elif data == "addcal:tomorrow":
                selected_date = datetime.now(user_tz).date() + timedelta(days=1)
            else:
                parts = data.split(":")
                selected_date = date(int(parts[1]), int(parts[2]), int(parts[3]))

            _pending_adds[chat_id] = {
                "step": "waiting_title",
                "selected_date": selected_date,
                "created_at": datetime.now(UTC),
            }

            if selected_date:
                date_str = selected_date.strftime("%d.%m.%Y")
            else:
                date_str = i18n_t("telegramAddNoDate", lang)
            await TelegramNotifierService.edit_message_text(
                bot_token, chat_id, message_id, date_str, None,
            )

            await TelegramNotifierService.send_message(
                bot_token, chat_id, i18n_t("telegramAddTitle", lang)
            )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data == "addcancel":
            self._clear_user_state(chat_id)
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
            await TelegramNotifierService.send_message(
                bot_token, chat_id, i18n_t("telegramAddCancelled", lang)
            )

        elif data.startswith("addarea:"):
            state = _pending_adds.get(chat_id)
            if not state or state.get("step") != "select_area":
                await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
                return

            if data == "addarea:skip":
                state["area_id"] = None
                area_text = i18n_t("telegramAddSkip", lang)
            else:
                state["area_id"] = data.split(":")[1]
                area_text = data.split(":")[1]

            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
            if message_id:
                await TelegramNotifierService.edit_message_text(
                    bot_token, chat_id, message_id, area_text,
                    {"inline_keyboard": []},
                )
            await self._proceed_after_area(db, user, chat_id, state, lang)

        elif data.startswith("addproj:"):
            state = _pending_adds.get(chat_id)
            if not state or state.get("step") != "select_project":
                await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
                return

            project_id = None if data == "addproj:skip" else data.split(":")[1]

            if project_id:
                proj_text = project_id
            else:
                proj_text = i18n_t("telegramAddSkip", lang)

            selected_date = state.get("selected_date")
            due_date = None
            if selected_date:
                due_date = datetime.combine(selected_date, time.max, tzinfo=user_tz).astimezone(UTC)

            del _pending_adds[chat_id]
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
            if message_id:
                await TelegramNotifierService.edit_message_text(
                    bot_token, chat_id, message_id, proj_text,
                    {"inline_keyboard": []},
                )
            await self._create_task(
                db, user, state["title"], due_date, lang,
                area_id=state.get("area_id"),
                project_id=project_id,
            )

        elif data == "dismiss":
            if message_id:
                await TelegramNotifierService.edit_message_text(
                    bot_token, chat_id, message_id,
                    message.get("text", ""),
                    {"inline_keyboard": []},
                )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data in ("action:today", "action:inbox"):
            if data == "action:today":
                today = datetime.now(user_tz).date()
                tasks = await self._get_tasks_for_date(db, user.id, today, user_tz)
                title = i18n_t("telegramCmdToday", lang)
            else:
                tasks = await self._get_inbox_tasks(db, user.id)
                title = i18n_t("telegramCmdInbox", lang)
            text, markup = self._format_task_list(tasks, title, user_tz, lang)
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id, text, markup
            )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data in ("stats:week", "stats:month"):
            period = "week" if data == "stats:week" else "month"
            await self._send_stats(
                db, user, bot_token, chat_id, lang, period,
                message_id=message_id, cq_id=cq_id,
            )

        elif data == "stats:dismiss":
            if message_id:
                await TelegramNotifierService.edit_message_text(
                    bot_token, chat_id, message_id,
                    message.get("text", ""),
                    {"inline_keyboard": []},
                )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)

        elif data.startswith("done:"):
            task_id = data.split(":")[1]
            await self._complete_task(
                user, task_id, cq_id, db, lang,
                chat_id=chat_id,
                message_id=message_id,
                message_text=message.get("text", ""),
                reply_markup=message.get("reply_markup"),
            )

    @staticmethod
    def _format_stats_bar(filled: int, total: int, width: int = 10) -> str:
        if total == 0:
            return "░" * width
        ratio = filled / total
        n = min(width, max(0, round(ratio * width)))
        return "█" * n + "░" * (width - n)

    async def _send_stats(
        self,
        db: AsyncSession,
        user: User,
        bot_token: str,
        chat_id: str,
        lang: str,
        period: str,
        message_id: int | None = None,
        cq_id: str | None = None,
    ) -> None:
        from sqlalchemy import func as sa_func

        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        now = datetime.now(user_tz)
        if period == "week":
            days = 7
            period_label = i18n_t("telegramStatsWeek", lang)
        else:
            days = 30
            period_label = i18n_t("telegramStatsMonth", lang)

        since = now - timedelta(days=days)

        completed_result = await db.execute(
            select(sa_func.count(Task.id)).where(
                Task.user_id == user.id,
                Task.is_completed.is_(True),
                Task.completed_at >= since,
            )
        )
        completed_count = completed_result.scalar() or 0

        created_result = await db.execute(
            select(sa_func.count(Task.id)).where(
                Task.user_id == user.id,
                Task.created_at >= since,
            )
        )
        created_count = created_result.scalar() or 0

        streak_result = await db.execute(
            select(Task.completed_at)
            .where(
                Task.user_id == user.id,
                Task.is_completed.is_(True),
                Task.completed_at >= now - timedelta(days=60),
            )
            .order_by(Task.completed_at.desc())
        )
        seen_days: set[date] = set()
        for row in streak_result.scalars().all():
            ts = row
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=UTC)
            seen_days.add(ts.astimezone(user_tz).date())
        streak = 0
        today = now.date()
        for i in range(60):
            expected = today - timedelta(days=i)
            if expected in seen_days:
                streak += 1
            else:
                break

        from app.models.project import Project
        top_projects_result = await db.execute(
            select(Project.name, sa_func.count(Task.id).label("cnt"))
            .join(Task, Task.project_id == Project.id)
            .where(
                Task.user_id == user.id,
                Task.is_completed.is_(True),
                Task.completed_at >= since,
            )
            .group_by(Project.name)
            .order_by(sa_func.count(Task.id).desc())
            .limit(3)
        )
        top_projects = list(top_projects_result.all())

        bar = self._format_stats_bar(completed_count, created_count)
        lines = [
            i18n_t("telegramStatsTitle", lang, period=period_label),
            "",
            f"{bar} {completed_count}/{created_count} {i18n_t('telegramStatsTasks', lang)}",
            f"🔥 {streak} {i18n_t('telegramStatsStreak', lang)}",
        ]

        if top_projects:
            lines.append("")
            lines.append(i18n_t("telegramStatsTopProjects", lang))
            for i, (name, cnt) in enumerate(top_projects, 1):
                lines.append(f"  {i}. {name} — {cnt}")

        if completed_count == 0 and created_count == 0:
            lines = [
                i18n_t("telegramStatsTitle", lang, period=period_label),
                "",
                i18n_t("telegramStatsNoData", lang),
            ]

        text = "\n".join(lines)

        keyboard = {
            "inline_keyboard": [
                [
                    {"text": i18n_t("telegramStatsWeekBtn", lang), "callback_data": "stats:week"},
                    {"text": i18n_t("telegramStatsMonthBtn", lang), "callback_data": "stats:month"},
                ],
                [
                    {"text": i18n_t("telegramStatsDismissBtn", lang), "callback_data": "stats:dismiss"},
                ],
            ]
        }

        if message_id and cq_id:
            await TelegramNotifierService.edit_message_text(
                bot_token, chat_id, message_id, text, keyboard,
            )
            await TelegramNotifierService.answer_callback_query(bot_token, cq_id)
        else:
            await TelegramNotifierService.send_message_with_buttons(
                bot_token, chat_id, text, keyboard,
            )

    async def _send_search_prompt(
        self, bot_token: str, chat_id: str, lang: str
    ) -> None:
        _pending_adds[chat_id] = {
            "step": "waiting_search",
            "created_at": datetime.now(UTC),
        }
        await TelegramNotifierService.send_message(
            bot_token, chat_id, i18n_t("telegramSearchHint", lang)
        )

    @staticmethod
    def _build_main_keyboard(lang: str) -> dict:
        return {
            "keyboard": [
                [
                    {"text": i18n_t("telegramKbInbox", lang)},
                    {"text": i18n_t("telegramKbToday", lang)},
                ],
                [
                    {"text": i18n_t("telegramKbAdd", lang)},
                    {"text": i18n_t("telegramKbStats", lang)},
                    {"text": i18n_t("telegramKbSearch", lang)},
                ],
                [
                    {"text": i18n_t("telegramKbHide", lang)},
                ],
            ],
            "resize_keyboard": True,
            "one_time_keyboard": False,
        }

    @staticmethod
    def _keyboard_button_commands() -> dict[str, str]:
        return {
            "📥 Входящие": "/inbox",
            "📥 Inbox": "/inbox",
            "📥 Кергән": "/inbox",
            "📅 Сегодня": "/today",
            "📅 Today": "/today",
            "📅 Бүген": "/today",
            "➕ Добавить": "/add",
            "➕ Add": "/add",
            "➕ Өстәү": "/add",
            "📊 Стат": "/stats",
            "📊 Stats": "/stats",
        }

    async def handle_text(
        self, user: User, text: str, db: AsyncSession
    ) -> None:
        self._cleanup_expired_states()

        chat_id = user.telegram_chat_id
        lang = getattr(user, "language", None) or "ru"

        kb_commands = self._keyboard_button_commands()
        if text in kb_commands:
            await self.handle_command(user, kb_commands[text], db)
            return

        if text == i18n_t("telegramKbHide", lang):
            await TelegramNotifierService.send_reply_keyboard_remove(
                user.decrypted_telegram_bot_token, chat_id,
            )
            return

        if text in (
            i18n_t("telegramKbSearch", "ru"),
            i18n_t("telegramKbSearch", "en"),
            i18n_t("telegramKbSearch", "tt"),
        ):
            await self._send_search_prompt(
                user.decrypted_telegram_bot_token, chat_id, lang
            )
            return

        state = _pending_adds.get(chat_id)
        if state and state.get("step") == "waiting_search":
            query = text.strip()
            del _pending_adds[chat_id]
            if query:
                user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
                tasks = await self._get_search_tasks(db, user.id, query)
                result_text, markup = self._format_search_results(
                    tasks, query, user_tz, lang
                )
                await TelegramNotifierService.send_message_with_buttons(
                    user.decrypted_telegram_bot_token, chat_id,
                    result_text, markup,
                )
            return

        if state and state.get("step") == "waiting_title":
            selected_date = state.get("selected_date")
            title = text[:255]

            await self._proceed_after_title(
                db, user, chat_id, title, selected_date, lang,
            )
            return

        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        today = datetime.now(user_tz).date()
        parsed = smart_parse(text, lang, today=today)

        due_date = None
        if parsed.due_date:
            t = parsed.due_time or time.max
            due_date = datetime.combine(parsed.due_date, t, tzinfo=user_tz).astimezone(UTC)
        elif parsed.due_time:
            due_date = datetime.combine(today, parsed.due_time, tzinfo=user_tz).astimezone(UTC)

        await self._create_task(
            db, user, parsed.title, due_date, lang,
            tag_names=parsed.tags if parsed.tags else None,
        )

    async def _complete_task(
        self,
        user: User,
        task_id: str,
        cq_id: str,
        db: AsyncSession,
        lang: str,
        chat_id: str | None = None,
        message_id: int | None = None,
        message_text: str = "",
        reply_markup: dict | None = None,
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

        if chat_id and message_id:
            new_text = message_text + f"\n✅ «{task_title}» выполнена"
            new_markup = None
            if reply_markup and "inline_keyboard" in reply_markup:
                filtered = [
                    row for row in reply_markup["inline_keyboard"]
                    if not any(
                        btn.get("callback_data") == f"done:{task_id}"
                        for btn in row
                    )
                ]
                if filtered:
                    new_markup = {"inline_keyboard": filtered}
            await TelegramNotifierService.edit_message_text(
                bot_token, chat_id, message_id, new_text, new_markup
            )

        from app.event_bus import event_bus
        await event_bus.publish(f"{user.id}:sync", "task_updated", {
            "task_id": str(task.id),
            "action": "completed",
        })

    async def handle_reply(
        self, user: User, task_id: str, text: str, db: AsyncSession
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
            return

        task_service = TaskService(db)
        task = await task_service.get_task(user.id, task_id)
        if not task:
            return

        confirmation = ""

        if action == "done":
            if not task.is_completed:
                await task_service.move_task(user.id, task.id, GtdStatus.COMPLETED, user=user)
            confirmation = i18n_t("telegramReplyDone", lang, title=task.title)
        elif action == "tomorrow":
            user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
            tomorrow = datetime.now(user_tz).date() + timedelta(days=1)
            task.due_date = datetime.combine(tomorrow, time.max, tzinfo=user_tz).astimezone(UTC)
            confirmation = i18n_t("telegramReplyTomorrow", lang, title=task.title)
        elif action == "today":
            user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
            today = datetime.now(user_tz).date()
            task.due_date = datetime.combine(today, time.max, tzinfo=user_tz).astimezone(UTC)
            confirmation = i18n_t("telegramReplyToday", lang, title=task.title)
        elif action == "delete":
            await task_service.move_task(user.id, task.id, GtdStatus.TRASH, user=user)
            confirmation = i18n_t("telegramReplyDeleted", lang, title=task.title)
        elif action == "inbox":
            await task_service.move_task(user.id, task.id, GtdStatus.INBOX, user=user)
            confirmation = i18n_t("telegramReplyInbox", lang, title=task.title)

        await db.flush()

        from app.event_bus import event_bus
        await event_bus.publish(f"{user.id}:sync", "task_updated", {
            "task_id": str(task.id),
            "action": action,
        })

        await TelegramNotifierService.send_message(bot_token, chat_id, confirmation)
