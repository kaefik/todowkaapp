import json
import logging
from datetime import UTC, datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t as i18n_t
from app.models.backup_schedule import BackupSchedule
from app.models.user import User
from app.services.export_import_service import ExportImportService
from app.services.telegram_notifier import TelegramNotifierService

logger = logging.getLogger(__name__)

MAX_BACKUP_SIZE = 50 * 1024 * 1024


class BackupScheduleService:
    def __init__(self, db: Annotated[AsyncSession, "db"]):
        self.db = db

    async def get_schedule(self, user_id: str) -> BackupSchedule | None:
        result = await self.db.execute(
            select(BackupSchedule).where(BackupSchedule.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_schedule(self, user_id: str, data: dict) -> BackupSchedule:
        schedule = BackupSchedule(user_id=user_id, **data)
        self.db.add(schedule)
        await self.db.flush()
        return schedule

    async def update_schedule(self, schedule: BackupSchedule, data: dict) -> BackupSchedule:
        for key, value in data.items():
            if value is not None:
                setattr(schedule, key, value)
        if data.get("period") == "weekly" and schedule.day_of_week is None:
            schedule.day_of_week = 1
        if data.get("period") == "monthly" and schedule.day_of_month is None:
            schedule.day_of_month = 1
        if data.get("period") == "daily":
            schedule.day_of_week = None
            schedule.day_of_month = None
        await self.db.flush()
        return schedule

    async def delete_schedule(self, schedule: BackupSchedule) -> None:
        await self.db.delete(schedule)
        await self.db.flush()

    async def send_backup_now(self, user: User) -> bool:
        if not user.telegram_bot_token or not user.telegram_chat_id:
            return False
        return await self._generate_and_send(user)

    async def _generate_and_send(self, user: User) -> bool:
        try:
            export_service = ExportImportService(self.db)
            data = await export_service.export_data(user_id=user.id)
            content = json.dumps(data, ensure_ascii=False, indent=2)
            json_bytes = content.encode("utf-8")

            if len(json_bytes) > MAX_BACKUP_SIZE:
                lang = getattr(user, 'language', None) or "ru"
                await TelegramNotifierService.send_message(
                    user.telegram_bot_token,
                    user.telegram_chat_id,
                    i18n_t("backupTooLarge", lang),
                )
                return False

            now = datetime.now(UTC)
            filename = f"todowka_backup_{now.strftime('%Y-%m-%d_%H-%M')}.json"
            caption = f"\U0001f4be Todowka backup {now.strftime('%d.%m.%Y %H:%M')} UTC"

            success = await TelegramNotifierService.send_document(
                user.telegram_bot_token, user.telegram_chat_id, filename, json_bytes, caption
            )
            return success
        except Exception as e:
            logger.error(f"Backup generation/sending failed for user {user.id}: {e}")
            return False

    async def process_due_backups(self) -> int:
        result = await self.db.execute(
            select(BackupSchedule).where(BackupSchedule.enabled.is_(True))
        )
        schedules = list(result.scalars().all())

        sent_count = 0
        now_utc = datetime.now(UTC)

        for schedule in schedules:
            user_result = await self.db.execute(
                select(User).where(User.id == schedule.user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                continue
            if not user.telegram_bot_token or not user.telegram_chat_id:
                continue

            user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
            now_local = now_utc.astimezone(user_tz)

            if not self._is_due(schedule, now_local):
                continue

            success = await self._generate_and_send(user)
            if success:
                schedule.last_sent_at = now_utc
                sent_count += 1
                await self.db.flush()

        return sent_count

    def _is_due(self, schedule: BackupSchedule, now_local: datetime) -> bool:
        hours, minutes = map(int, schedule.time.split(":"))
        if now_local.hour != hours or now_local.minute != minutes:
            return False

        if schedule.period == "weekly":
            if now_local.isoweekday() != (schedule.day_of_week or 1):
                return False
        elif schedule.period == "monthly":
            if now_local.day != (schedule.day_of_month or 1):
                return False

        if schedule.last_sent_at:
            last_sent_local = schedule.last_sent_at.replace(tzinfo=UTC).astimezone(
                ZoneInfo("UTC")
            )
            if schedule.period == "daily":
                if (now_local.date() - last_sent_local.date()).days < 1:
                    return False
            elif schedule.period == "weekly":
                days_since = (now_local.date() - last_sent_local.date()).days
                if days_since < 7:
                    return False
            elif schedule.period == "monthly":
                if (
                    now_local.month == last_sent_local.month
                    and now_local.year == last_sent_local.year
                ):
                    return False

        return True
