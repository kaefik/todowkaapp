import logging
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

import httpx

from app.i18n import t as i18n_t

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org/bot{token}/{method}"
HTTPX_TIMEOUT = 10.0


class TelegramNotifierService:
    @staticmethod
    async def validate_token(bot_token: str) -> dict | None:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="getMe")
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.get(url)
                data = resp.json()
                if data.get("ok"):
                    return {
                        "bot_username": data["result"]["username"],
                        "bot_name": data["result"].get("first_name", ""),
                    }
                return None
        except (httpx.HTTPError, KeyError) as e:
            logger.warning(f"Telegram validate_token failed: {e}")
            return None

    @staticmethod
    async def poll_updates(
        bot_token: str, offset: int | None = None
    ) -> tuple[list[dict], int | None]:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="getUpdates")
        params: dict = {"timeout": 0}
        if offset is not None:
            params["offset"] = offset
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.get(url, params=params)
                data = resp.json()
                if not data.get("ok"):
                    return [], offset
                updates = data.get("result", [])
                new_offset = (updates[-1]["update_id"] + 1) if updates else offset
                return updates, new_offset
        except (httpx.HTTPError, KeyError, IndexError) as e:
            logger.warning(f"Telegram poll_updates failed: {e}")
            return [], offset

    @staticmethod
    async def send_message(bot_token: str, chat_id: str, text: str) -> dict | None:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="sendMessage")
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.post(url, json=payload)
                data = resp.json()
                if resp.status_code == 403:
                    logger.warning(f"Telegram bot blocked by user chat_id={chat_id}")
                    return None
                if not data.get("ok"):
                    logger.warning(f"Telegram sendMessage failed: {data}")
                    return None
                return data["result"]
        except httpx.HTTPError as e:
            logger.warning(f"Telegram send_message error: {e}")
            return None

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

    @staticmethod
    async def send_document(
        bot_token: str, chat_id: str, filename: str, json_bytes: bytes, caption: str = ""
    ) -> bool:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="sendDocument")
        data = {
            "chat_id": chat_id,
            "caption": caption,
        }
        files = {
            "document": (filename, json_bytes, "application/json"),
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, data=data, files=files)
                resp_data = resp.json()
                if resp.status_code == 403:
                    logger.warning(f"Telegram bot blocked by user chat_id={chat_id}")
                    return False
                if not resp_data.get("ok"):
                    logger.warning(f"Telegram sendDocument failed: {resp_data}")
                    return False
                return True
        except httpx.HTTPError as e:
            logger.warning(f"Telegram send_document error: {e}")
            return False

    @staticmethod
    def _build_task_link(task_id, frontend_url: str, lang: str = "ru") -> str:
        return f'<a href="{frontend_url}/tasks?viewTaskId={task_id}">{i18n_t("telegramOpenTask", lang)}</a>'

    @staticmethod
    def format_full_task_info(task: 'Task', user_tz: ZoneInfo, frontend_url: str | None = None, lang: str = "ru") -> str:
        lines = [
            f"\U0001f514 <b>{i18n_t('telegramReminderTitle', lang)}</b>",
            "",
            f"\U0001f4cb {task.title}",
        ]

        if task.description:
            desc = task.description if len(task.description) <= 100 else task.description[:100] + "..."
            lines.append(f"\U0001f4dd {i18n_t('telegramDescription', lang)} {desc}")

        if task.project:
            lines.append(f"\U0001f4c1 {i18n_t('telegramProject', lang)} {task.project.name}")

        if task.area:
            lines.append(f"\U0001f3eb {i18n_t('telegramArea', lang)} {task.area.name}")

        if task.context:
            lines.append(f"\U0001f4cd {i18n_t('telegramContext', lang)} {task.context.name}")

        if task.tags:
            tag_names = ", ".join(t.name for t in task.tags)
            lines.append(f"\U0001f3f7\ufe0f {i18n_t('telegramTags', lang)} {tag_names}")

        due_date = task.due_date
        if due_date:
            if due_date.tzinfo is None:
                local_due = due_date.replace(tzinfo=user_tz)
            else:
                local_due = due_date.astimezone(user_tz)

            if local_due.hour == 0 and local_due.minute == 0:
                date_str = local_due.strftime('%d.%m.%Y')
            else:
                date_str = local_due.strftime('%d.%m.%Y %H:%M')
            lines.append(f"\U0001f4c5 {i18n_t('telegramDeadline', lang)} {date_str}")

        if task.recurrence_type:
            recurrence_text = task.recurrence_type
            if task.recurrence_config:
                freq = task.recurrence_config.get('frequency', '')
                interval = task.recurrence_config.get('interval', 1)
                if freq == 'daily':
                    recurrence_text = i18n_t('recurrenceDaily', lang, interval=interval)
                elif freq == 'weekly':
                    recurrence_text = i18n_t('recurrenceWeekly', lang, interval=interval)
                elif freq == 'monthly':
                    recurrence_text = i18n_t('recurrenceMonthly', lang, interval=interval)
            lines.append(f"\U0001f504 {i18n_t('telegramRecurrence', lang)} {recurrence_text}")

        gtd_status_map = {
            'inbox': i18n_t('gtdInbox', lang),
            'active': i18n_t('gtdActive', lang),
            'next': i18n_t('gtdNext', lang),
            'waiting': i18n_t('gtdWaiting', lang),
            'someday': i18n_t('gtdSomeday', lang),
            'completed': i18n_t('gtdCompleted', lang),
            'trash': i18n_t('gtdTrash', lang),
        }
        status_text = gtd_status_map.get(task.gtd_status, task.gtd_status)
        lines.append(f"\U0001f4ca {i18n_t('telegramStatus', lang)} {status_text}")

        if task.notes:
            lines.append(f"\U0001f4dd\ufe0f {i18n_t('telegramNotes', lang)} {task.notes}")

        created_at = task.created_at
        if created_at:
            if created_at.tzinfo is None:
                local_created = created_at.replace(tzinfo=ZoneInfo('UTC')).astimezone(user_tz)
            else:
                local_created = created_at.astimezone(user_tz)
            lines.append(f"\U0001f4c5 {i18n_t('telegramCreated', lang)} {local_created.strftime('%d.%m.%Y %H:%M')}")

        if frontend_url and task.id:
            lines.append("")
            lines.append(TelegramNotifierService._build_task_link(task.id, frontend_url, lang))

        return "\n".join(lines)

    @staticmethod
    async def send_reminder(user: 'User', task: 'Task') -> bool:
        bot_token = user.decrypted_telegram_bot_token
        if not bot_token or not user.telegram_chat_id:
            return False

        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        lang = getattr(user, 'language', None) or "ru"

        from app.config import settings
        text = TelegramNotifierService.format_full_task_info(task, user_tz, frontend_url=settings.frontend_url, lang=lang)

        result = await TelegramNotifierService.send_message(
            bot_token, user.telegram_chat_id, text
        )

        if not result:
            logger.warning(f"Failed to send Telegram reminder to user {user.id}")

        return result is not None

    @staticmethod
    async def send_daily_digest(
        bot_token: str,
        chat_id: str,
        today_text: str,
        today_tasks_lines: list[str],
        overdue_count: int,
        inbox_count: int,
        lang: str,
    ) -> dict | None:
        from app.i18n import t as i18n_t

        lines = [i18n_t("telegramDigestMorning", lang), ""]

        if today_tasks_lines:
            lines.append(i18n_t("telegramDigestToday", lang, count=len(today_tasks_lines)))
            for task_line in today_tasks_lines[:20]:
                lines.append(f"  {task_line}")
        else:
            lines.append(i18n_t("telegramDigestNoTasks", lang))

        if overdue_count > 0:
            lines.append("")
            lines.append(i18n_t("telegramDigestOverdue", lang, count=overdue_count))

        if inbox_count > 0:
            lines.append(i18n_t("telegramDigestInbox", lang, count=inbox_count))

        keyboard = {
            "inline_keyboard": [
                [
                    {"text": i18n_t("telegramDigestAllTasksBtn", lang), "callback_data": "action:today"},
                    {"text": i18n_t("telegramDigestInboxBtn", lang), "callback_data": "action:inbox"},
                ]
            ]
        }

        return await TelegramNotifierService.send_message_with_buttons(
            bot_token, chat_id, "\n".join(lines), keyboard,
        )
