from datetime import datetime, timedelta
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class ReminderService:
    def __init__(self, db: 'AsyncSession'):
        self.db = db

    async def find_due_tasks(self) -> list[Task]:
        now_utc = datetime.utcnow()

        result = await self.db.execute(
            select(Task)
            .options(selectinload(Task.user))
            .where(
                Task.due_date.isnot(None),
                not Task.is_completed
            )
        )
        tasks = list(result.scalars().all())

        due_tasks = []
        for task in tasks:
            if not task.user:
                continue

            reminder_dt = None

            if task.reminder_time:
                due_date = task.due_date.replace(tzinfo=None)
                reminder_dt = datetime.combine(due_date.date(), task.reminder_time)
                if reminder_dt > due_date:
                    reminder_dt = reminder_dt - timedelta(days=1)
            elif task.reminder_offsets:
                for offset_minutes in task.reminder_offsets:
                    reminder_dt = task.due_date.replace(tzinfo=None) - timedelta(minutes=offset_minutes)
                    if now_utc >= reminder_dt:
                        due_tasks.append(task)
                        break
                continue

            if reminder_dt and now_utc >= reminder_dt:
                due_tasks.append(task)

        return due_tasks

    async def send_reminder(self, task: Task, user: User) -> Notification:
        user_timezone = user.timezone or 'UTC'

        due_date_local = self.convert_to_user_timezone(task.due_date, user_timezone)
        due_date_str = due_date_local.strftime('%d.%m.%Y %H:%M')

        message = f'Напоминание: "{task.title}" истекает {due_date_str}'

        notification = await self.create_notification(
            user=user,
            task=task,
            type='due_reminder',
            message=message
        )

        task.last_reminder_sent_at = datetime.utcnow()
        await self.db.flush()

        return notification

    async def create_notification(
        self, user: User, task: Task | None, type: str, message: str
    ) -> Notification:
        expires_at = datetime.utcnow() + timedelta(days=30)

        notification = Notification(
            user_id=user.id,
            task_id=task.id if task else None,
            type=type,
            message=message,
            expires_at=expires_at
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def get_unread_notifications(
        self, user_id: str | UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[Notification], int]:
        count_stmt = select(func.count(Notification.id)).where(
            Notification.user_id == str(user_id),
            not Notification.is_read
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Notification)
            .options(selectinload(Notification.task))
            .where(
                Notification.user_id == str(user_id),
                not Notification.is_read
            )
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        notifications = list(result.scalars().all())
        return notifications, total

    async def mark_as_read(self, notification_id: str | UUID) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(Notification.id == str(notification_id))
        )
        notification = result.scalar_one_or_none()

        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            await self.db.flush()

        return notification

    async def mark_all_as_read(self, user_id: str | UUID) -> int:
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Notification).where(
                Notification.user_id == str(user_id),
                not Notification.is_read
            )
        )
        notifications = list(result.scalars().all())

        for notification in notifications:
            notification.is_read = True
            notification.read_at = now

        await self.db.flush()
        return len(notifications)

    def convert_to_user_timezone(self, dt: datetime, user_timezone: str) -> datetime:
        try:
            from zoneinfo import ZoneInfo

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=ZoneInfo('UTC'))

            target_tz = ZoneInfo(user_timezone)
            return dt.astimezone(target_tz)
        except Exception:
            return dt

    def should_send_reminder(self, task: Task) -> bool:
        if not task.last_reminder_sent_at:
            return True

        now = datetime.utcnow()
        time_since_last_reminder = now - task.last_reminder_sent_at

        return time_since_last_reminder >= timedelta(hours=24)

    async def cleanup_expired_notifications(self, days: int = 30) -> int:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = await self.db.execute(
            delete(Notification).where(Notification.expires_at < cutoff_date)
        )
        deleted_count = result.rowcount
        await self.db.flush()
        return deleted_count
