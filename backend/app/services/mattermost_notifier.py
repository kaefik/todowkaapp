import logging
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from app.adapters.mattermost_adapter import MattermostBotAdapter
from app.i18n import t as i18n_t

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User

logger = logging.getLogger(__name__)


async def get_mattermost_config_from_db():
    """Get Mattermost config from system_settings table"""
    from sqlalchemy import text

    from app.database import async_session_factory

    async with async_session_factory() as db:
        result = await db.execute(text(
            "SELECT key, value FROM system_settings WHERE key LIKE 'mattermost_%'"
        ))
        rows = result.fetchall()
        config = {
            'mattermost_url': None,
            'mattermost_bot_token': None,
        }
        for row in rows:
            if row[0] == 'mattermost_url':
                config['mattermost_url'] = row[1]
            elif row[0] == 'mattermost_bot_token' and row[1]:
                from app.services.crypto_service import decrypt_secret
                config['mattermost_bot_token'] = decrypt_secret(row[1])
        return config


class MattermostNotifierService:
    @staticmethod
    def format_full_task_info(task: 'Task', user_tz: ZoneInfo, frontend_url: str | None = None, lang: str = "ru") -> str:
        lines = [
            f"**{i18n_t('telegramReminderTitle', lang)}**",
            "",
            f"**{task.title}**",
        ]

        if task.description:
            desc = task.description if len(task.description) <= 100 else task.description[:100] + "..."
            lines.append(f"📝 {i18n_t('telegramDescription', lang)} {desc}")

        if task.project:
            lines.append(f"📁 {i18n_t('telegramProject', lang)} {task.project.name}")

        if task.area:
            lines.append(f"🏫 {i18n_t('telegramArea', lang)} {task.area.name}")

        if task.context:
            lines.append(f"📍 {i18n_t('telegramContext', lang)} {task.context.name}")

        if task.tags:
            tag_names = ", ".join(t.name for t in task.tags)
            lines.append(f"🏷️ {i18n_t('telegramTags', lang)} {tag_names}")

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
            lines.append(f"📅 {i18n_t('telegramDeadline', lang)} {date_str}")

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
            lines.append(f"🔄 {i18n_t('telegramRecurrence', lang)} {recurrence_text}")

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
        lines.append(f"📊 {i18n_t('telegramStatus', lang)} {status_text}")

        if task.notes:
            lines.append(f"📝 {i18n_t('telegramNotes', lang)} {task.notes}")

        created_at = task.created_at
        if created_at:
            if created_at.tzinfo is None:
                local_created = created_at.replace(tzinfo=ZoneInfo('UTC')).astimezone(user_tz)
            else:
                local_created = created_at.astimezone(user_tz)
            lines.append(f"📅 {i18n_t('telegramCreated', lang)} {local_created.strftime('%d.%m.%Y %H:%M')}")

        if frontend_url and task.id:
            lines.append("")
            lines.append(f"[{i18n_t('telegramOpenTask', lang)}]({frontend_url}/tasks?viewTaskId={task.id})")

        return "\n".join(lines)

    @staticmethod
    async def send_reminder(user: 'User', task: 'Task') -> bool:
        if not user.mattermost_notifications_enabled or not user.mattermost_user_id:
            return False

        from app.config import settings

        # Get config from DB first, fallback to .env
        db_config = await get_mattermost_config_from_db()

        if user.mattermost_bind_mode == 'bot':
            token = db_config.get('mattermost_bot_token') or settings.mattermost_bot_token
            if not token:
                logger.warning(f"No Mattermost bot token configured for bot mode user {user.id}")
                return False
            mattermost_url = db_config.get('mattermost_url') or settings.mattermost_url
        else:
            token = user.decrypted_mattermost_bot_token
            if not token:
                return False
            mattermost_url = user.mattermost_url or db_config.get('mattermost_url') or settings.mattermost_url

        if not mattermost_url:
            logger.warning(f"No Mattermost URL configured for user {user.id}")
            return False

        user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
        lang = getattr(user, 'language', None) or "ru"

        text = MattermostNotifierService.format_full_task_info(task, user_tz, frontend_url=settings.frontend_url, lang=lang)

        adapter = MattermostBotAdapter(mattermost_url, token)

        dm_channel_id = await adapter.get_or_create_dm_channel(user.mattermost_user_id)
        if not dm_channel_id:
            logger.warning(f"Failed to get DM channel for user {user.id}")
            return False

        result = await adapter.send_message(dm_channel_id, text)

        if not result:
            logger.warning(f"Failed to send Mattermost reminder to user {user.id}")
            return False

        return True
