import logging
from datetime import date, datetime, time, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from app.adapters.mattermost_adapter import MattermostBotAdapter
from app.database import AsyncSessionLocal
from app.i18n import t as i18n_t
from app.services.base_command_service import BaseCommandService
from app.services.telegram_smart_parser import parse as smart_parse

logger = logging.getLogger(__name__)


class MattermostCommandService(BaseCommandService):
    """Command handler for Mattermost bot"""

    COMMAND_MAP = {
        '/today': '/today',
        '/tomorrow': '/tomorrow',
        '/inbox': '/inbox',
        '/add': '/add',
        '/search': '/search',
        '/s': '/search',
        '/stats': '/stats',
        '/export': '/export',
        '/help': '/help',
        '/?': '/help',
    }

    def __init__(self, adapter: MattermostBotAdapter):
        super().__init__()
        self.adapter = adapter

    async def handle_command(self, command: str, args: str, user_id: str) -> dict:
        """Handle a slash command"""
        return await self.handle_slash_command(command, args, user_id)

    async def handle_slash_command(
        self, command: str, args: str, user_id: str
    ) -> dict:
        """Handle Mattermost slash command. Returns response dict."""
        from app.models.user import User
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.mattermost_user_id == user_id)
            )
            user = result.scalar_one_or_none()

        if not user:
            return {
                "response_type": "ephemeral",
                "text": i18n_t("mattermostNotLinked", "en"),
            }

        lang = user.language or "ru"
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        if command == '/today':
            return await self._handle_today(user, user_tz, lang)
        elif command == '/tomorrow':
            return await self._handle_tomorrow(user, user_tz, lang)
        elif command == '/inbox':
            return await self._handle_inbox(user, lang)
        elif command == '/add':
            return await self._handle_add_start(user, lang)
        elif command in ('/search', '/s'):
            return await self._handle_search(user, args, user_tz, lang)
        elif command == '/help':
            return self._handle_help(lang)
        elif command == '/stats':
            return await self._handle_stats(user, user_tz, lang)
        elif command == '/export':
            return await self._handle_export(user)
        else:
            return {
                "response_type": "ephemeral",
                "text": i18n_t("mattermostUnknownCommand", lang),
            }

    async def handle_callback(self, callback_data: str, user_id: str) -> dict:
        """Handle Interactive Message action"""
        if callback_data.startswith("done:"):
            task_id = callback_data.split(":", 1)[1]
            return await self._handle_done(task_id, user_id)
        elif callback_data == "dismiss":
            return {"delete_original": True}
        elif callback_data.startswith("cal:"):
            return await self._handle_calendar_view(callback_data, user_id)
        elif callback_data.startswith("addcal:"):
            return await self._handle_add_calendar(callback_data, user_id)
        elif callback_data.startswith("addarea:"):
            return await self._handle_add_area(callback_data, user_id)
        elif callback_data.startswith("addproj:"):
            return await self._handle_add_project(callback_data, user_id)
        return {}

    async def handle_text(self, text: str, user_id: str) -> dict:
        """Handle plain text message"""
        from app.models.user import User
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.mattermost_user_id == user_id)
            )
            user = result.scalar_one_or_none()

        if not user:
            return {}

        lang = user.language or "ru"
        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        # Check if in add flow
        if user_id in self._pending_adds:
            return await self._handle_add_text(text, user, user_tz, lang)

        # Reply-based actions
        lower_text = text.strip().lower()
        if lower_text in ('done', 'готово', '✅', 'v', 'д'):
            return await self._handle_reply_done(user_id)
        elif lower_text in ('tomorrow', 'завтра'):
            return await self._handle_reply_tomorrow(user_id)
        elif lower_text in ('today', 'сегодня'):
            return await self._handle_reply_today(user_id)
        elif lower_text in ('delete', 'удалить', 'del', 'дель'):
            return await self._handle_reply_delete(user_id)
        elif lower_text == 'inbox':
            return await self._handle_reply_inbox(user_id)

        # Smart parser - create task from plain text
        return await self._handle_smart_add(text, user, user_tz, lang)

    def _handle_help(self, lang: str) -> dict:
        help_text = (
            f"**{i18n_t('telegramHelpTitle', lang)}**\n\n"
            f"/today - {i18n_t('telegramHelpToday', lang)}\n"
            f"/tomorrow - {i18n_t('telegramHelpTomorrow', lang)}\n"
            f"/inbox - {i18n_t('telegramHelpInbox', lang)}\n"
            f"/add - {i18n_t('telegramHelpAdd', lang)}\n"
            f"/search - {i18n_t('telegramHelpSearch', lang)}\n"
            f"/stats - {i18n_t('telegramHelpStats', lang)}\n"
            f"/export - {i18n_t('telegramHelpExport', lang)}\n"
        )
        return {"response_type": "ephemeral", "text": help_text}

    async def _handle_today(self, user, user_tz, lang) -> dict:
        from app.services.telegram_command_service import TelegramCommandService
        from app.models.task import Task, GtdStatus
        from sqlalchemy import select, or_

        async with AsyncSessionLocal() as db:
            now = datetime.now(user_tz)
            start = datetime.combine(now.date(), time.min, tzinfo=user_tz)
            end = datetime.combine(now.date(), time.max, tzinfo=user_tz)
            today_start = datetime.combine(now.date(), time.min, tzinfo=user_tz)

            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.is_completed.is_(False),
                    Task.gtd_status != GtdStatus.TRASH.value,
                    or_(Task.due_date.between(start, end), Task.due_date < today_start),
                ).order_by(Task.due_date).limit(25)
            )
            tasks = list(result.scalars().all())

        title = i18n_t("telegramTodayTitle", lang)
        service = TelegramCommandService()
        text, _ = service._format_task_list(tasks, title, user_tz, lang)

        buttons = [
            {"text": f"✓ {t.title[:30]}", "callback_data": f"done:{t.id}"}
            for t in tasks[:10] if not t.is_completed
        ]

        return {
            "response_type": "ephemeral",
            "text": text,
            "attachments": [{"actions": [
                {"name": b["text"], "type": "button", "integration": {"url": "", "context": {"action": b["callback_data"]}}}
                for b in buttons
            ]}] if buttons else [],
        }

    async def _handle_tomorrow(self, user, user_tz, lang) -> dict:
        from datetime import datetime, time, timedelta
        from app.models.task import Task, GtdStatus
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            tomorrow = datetime.now(user_tz).date() + timedelta(days=1)
            start = datetime.combine(tomorrow, time.min, tzinfo=user_tz)
            end = datetime.combine(tomorrow, time.max, tzinfo=user_tz)

            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.is_completed.is_(False),
                    Task.gtd_status != GtdStatus.TRASH.value,
                    Task.due_date.between(start, end),
                ).order_by(Task.due_date).limit(25)
            )
            tasks = list(result.scalars().all())

        title = i18n_t("telegramTomorrowTitle", lang)
        service = TelegramCommandService()
        text, _ = service._format_task_list(tasks, title, user_tz, lang)

        return {"response_type": "ephemeral", "text": text}

    async def _handle_inbox(self, user, lang) -> dict:
        from app.models.task import Task, GtdStatus
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.gtd_status == GtdStatus.INBOX.value,
                    Task.is_completed.is_(False),
                ).order_by(Task.created_at.desc()).limit(25)
            )
            tasks = list(result.scalars().all())

        title = i18n_t("telegramInboxTitle", lang)
        service = TelegramCommandService()
        text, _ = service._format_task_list(tasks, title, ZoneInfo(user.timezone or "Europe/Moscow"), lang)

        return {"response_type": "ephemeral", "text": text}

    async def _handle_add_start(self, user, lang) -> dict:
        self._pending_adds[user.mattermost_user_id] = {
            "step": "date",
            "created_at": datetime.now(datetime.UTC),
        }
        buttons = self.build_calendar_keyboard(
            date.today().year,
            date.today().month,
            "addcal",
            lang,
        )
        return {
            "response_type": "ephemeral",
            "text": i18n_t("telegramAddPickDate", lang),
            "attachments": [{"actions": [
                {"name": b["text"], "type": "button", "integration": {"url": "", "context": {"action": b["callback_data"]}}}
                for row in buttons for b in row if b.get("callback_data") != "ignore"
            ]}],
        }

    async def _handle_search(self, user, query, user_tz, lang) -> dict:
        if not query:
            return {"response_type": "ephemeral", "text": i18n_t("telegramSearchPrompt", lang)}

        from app.models.task import Task, GtdStatus
        from sqlalchemy import select, or_

        like_pattern = f"%{query}%"
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.is_completed.is_(False),
                    Task.gtd_status != GtdStatus.TRASH.value,
                    or_(Task.title.ilike(like_pattern), Task.description.ilike(like_pattern)),
                ).order_by(Task.due_date.asc().nulls_last()).limit(11)
            )
            tasks = list(result.scalars().all())

        service = TelegramCommandService()
        text, _ = service._format_search_results(tasks, query, user_tz, lang)

        return {"response_type": "ephemeral", "text": text}

    async def _handle_stats(self, user, user_tz, lang) -> dict:
        from datetime import datetime, timedelta
        from app.models.task import Task
        from sqlalchemy import select, func

        async with AsyncSessionLocal() as db:
            week_ago = datetime.now(user_tz) - timedelta(days=7)
            result = await db.execute(
                select(
                    func.count(Task.id).label('total'),
                    func.count(Task.id).filter(Task.is_completed.is_(True)).label('completed'),
                ).where(Task.user_id == user.id, Task.created_at >= week_ago)
            )
            stats = result.one()

        total = stats.total or 0
        completed = stats.completed or 0
        ratio = f"{completed}/{total}" if total > 0 else "0/0"

        text = (
            f"**{i18n_t('telegramStatsTitle', lang)}**\n\n"
            f"7 дней: {ratio} ({i18n_t('telegramStatsCompleted', lang)})"
        )
        return {"response_type": "ephemeral", "text": text}

    async def _handle_export(self, user) -> dict:
        from app.services.export_import_service import ExportImportService

        async with AsyncSessionLocal() as db:
            export_service = ExportImportService(db)
            data = await export_service.export_data(user_id=user.id)

        return {
            "response_type": "ephemeral",
            "text": f"Экспорт данных: {len(data)} записей",
        }

    async def _handle_done(self, task_id, user_id) -> dict:
        from app.models.task import Task
        from app.services.task_service import TaskService
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            if task:
                task_service = TaskService(db)
                await task_service.complete_task(task)
                await db.commit()
                return {"ephemeral_text": f"✓ {task.title}"}
        return {"ephemeral_text": "Задача не найдена"}

    async def _handle_calendar_view(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if len(parts) == 4:
            _, year, month, day = parts
            return await self._show_tasks_for_date(
                user_id, date(int(year), int(month), int(day))
            )
        return {}

    async def _handle_add_calendar(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if len(parts) == 4:
            _, year, month, day = parts
            self._pending_adds[user_id]["due_date"] = date(int(year), int(month), int(day))
            self._pending_adds[user_id]["step"] = "title"
            return {"ephemeral_text": i18n_t("telegramAddEnterTitle", "ru")}
        elif parts[1] == "nodate":
            self._pending_adds[user_id]["due_date"] = None
            self._pending_adds[user_id]["step"] = "title"
            return {"ephemeral_text": i18n_t("telegramAddEnterTitle", "ru")}
        return {}

    async def _handle_add_area(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if parts[1] == "skip":
            self._pending_adds[user_id]["area_id"] = None
        else:
            self._pending_adds[user_id]["area_id"] = parts[1]
        self._pending_adds[user_id]["step"] = "project"
        return {"ephemeral_text": i18n_t("telegramAddPickProject", "ru")}

    async def _handle_add_project(self, callback_data, user_id) -> dict:
        parts = callback_data.split(":")
        if parts[1] == "skip":
            self._pending_adds[user_id]["project_id"] = None
        else:
            self._pending_adds[user_id]["project_id"] = parts[1]
        return await self._finalize_add(user_id)

    async def _handle_add_text(self, text, user, user_tz, lang) -> dict:
        state = self._pending_adds.get(user.mattermost_user_id)
        if not state:
            return {}

        if state["step"] == "title":
            state["title"] = text
            state["step"] = "area"
            return {"ephemeral_text": i18n_t("telegramAddPickArea", lang)}
        elif state["step"] == "project":
            return await self._finalize_add(user.mattermost_user_id)

        return {}

    async def _handle_smart_add(self, text, user, user_tz, lang) -> dict:
        parsed = smart_parse(text, lang)
        from app.models.task import Task, GtdStatus

        async with AsyncSessionLocal() as db:
            task = Task(
                user_id=user.id,
                title=parsed["title"],
                due_date=parsed.get("due_date"),
                gtd_status=GtdStatus.INBOX.value,
            )
            db.add(task)
            await db.commit()
            return {"ephemeral_text": f"✓ Создана: {task.title}"}

    async def _finalize_add(self, user_id) -> dict:
        state = self._pending_adds.pop(user_id, None)
        if not state or "title" not in state:
            return {"ephemeral_text": "Ошибка"}

        from app.models.task import Task, GtdStatus
        async with AsyncSessionLocal() as db:
            task = Task(
                user_id=state.get("user_id"),
                title=state["title"],
                due_date=state.get("due_date"),
                area_id=state.get("area_id"),
                project_id=state.get("project_id"),
                gtd_status=GtdStatus.INBOX.value,
            )
            db.add(task)
            await db.commit()
            return {"ephemeral_text": f"✓ Создана: {task.title}"}

    async def _show_tasks_for_date(self, user_id, target_date) -> dict:
        return {"response_type": "ephemeral", "text": f"Задачи на {target_date}"}

    async def _handle_reply_done(self, user_id) -> dict:
        return {"ephemeral_text": "Отметить задачу"}

    async def _handle_reply_tomorrow(self, user_id) -> dict:
        return {"ephemeral_text": "Перенести на завтра"}

    async def _handle_reply_today(self, user_id) -> dict:
        return {"ephemeral_text": "Перенести на сегодня"}

    async def _handle_reply_delete(self, user_id) -> dict:
        return {"ephemeral_text": "Удалить задачу"}

    async def _handle_reply_inbox(self, user_id) -> dict:
        return {"ephemeral_text": "Переместить в inbox"}
