import logging
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

import httpx

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
    async def send_message(bot_token: str, chat_id: str, text: str) -> bool:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="sendMessage")
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
        try:
            async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
                resp = await client.post(url, json=payload)
                data = resp.json()
                if resp.status_code == 403:
                    logger.warning(f"Telegram bot blocked by user chat_id={chat_id}")
                    return False
                if not data.get("ok"):
                    logger.warning(f"Telegram sendMessage failed: {data}")
                    return False
                return True
        except httpx.HTTPError as e:
            logger.warning(f"Telegram send_message error: {e}")
            return False

    @staticmethod
    def format_full_task_info(task: 'Task', user_tz: ZoneInfo) -> str:
        lines = [
            "\U0001f514 <b>Напоминание о задаче</b>",
            "",
            f"\U0001f4cb {task.title}",
        ]

        if task.description:
            lines.append(f"\U0001f4dd Описание: {task.description}")

        if task.project:
            lines.append(f"\U0001f4c1 Проект: {task.project.name}")

        if task.area:
            lines.append(f"\U0001f3eb Область: {task.area.name}")

        if task.context:
            lines.append(f"\U0001f4cd Контекст: {task.context.name}")

        if task.tags:
            tag_names = ", ".join(t.name for t in task.tags)
            lines.append(f"\U0001f3f7\ufe0f Теги: {tag_names}")

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
            lines.append(f"\U0001f4c5 Дедлайн: {date_str}")

        if task.recurrence_type:
            recurrence_text = task.recurrence_type
            if task.recurrence_config:
                freq = task.recurrence_config.get('frequency', '')
                interval = task.recurrence_config.get('interval', 1)
                if freq == 'daily':
                    recurrence_text = f"Ежедневно (каждые {interval} дней)"
                elif freq == 'weekly':
                    recurrence_text = f"Еженедельно (каждую {interval} неделю)"
                elif freq == 'monthly':
                    recurrence_text = f"Ежемесячно (каждые {interval} месяц(ев))"
            lines.append(f"\U0001f504 Повторение: {recurrence_text}")

        gtd_status_map = {
            'inbox': 'Входящие',
            'active': 'Активно',
            'next': 'Следующее',
            'waiting': 'Ожидание',
            'someday': 'Когда-нибудь',
            'completed': 'Выполнено',
            'trash': 'Корзина'
        }
        status_text = gtd_status_map.get(task.gtd_status, task.gtd_status)
        lines.append(f"\U0001f4ca Статус: {status_text}")

        if task.notes:
            lines.append(f"\U0001f4dd\ufe0f Заметки: {task.notes}")

        created_at = task.created_at
        if created_at:
            if created_at.tzinfo is None:
                local_created = created_at.replace(tzinfo=ZoneInfo('UTC')).astimezone(user_tz)
            else:
                local_created = created_at.astimezone(user_tz)
            lines.append(f"\U0001f4c5 Создано: {local_created.strftime('%d.%m.%Y %H:%M')}")

        return "\n".join(lines)

    @staticmethod
    async def send_reminder(user: 'User', task: 'Task') -> bool:
        if not user.telegram_bot_token or not user.telegram_chat_id:
            return False

        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")

        text = TelegramNotifierService.format_full_task_info(task, user_tz)

        success = await TelegramNotifierService.send_message(
            user.telegram_bot_token, user.telegram_chat_id, text
        )

        if not success:
            logger.warning(f"Failed to send Telegram reminder to user {user.id}")

        return success
