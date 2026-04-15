from datetime import datetime, time, timedelta
from typing import TYPE_CHECKING
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, or_, select, update
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
        now_utc = datetime.now(ZoneInfo('UTC'))

        result = await self.db.execute(
            select(Task)
            .options(selectinload(Task.user))
            .where(
                Task.due_date.isnot(None),
                Task.is_completed == False,
                or_(
                    Task.last_reminder_sent_at.is_(None),
                    Task.last_reminder_sent_at <= now_utc - timedelta(hours=24),
                )
            )
        )
        tasks = list(result.scalars().all())

        due_tasks = []
        for task in tasks:
            if not task.user:
                continue

            user_timezone = ZoneInfo(task.user.timezone or 'Europe/Moscow')
            reminder_dt = None

            if task.reminder_time:
                due_date = task.due_date
                if due_date.tzinfo is None:
                    due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))
                due_date_local = due_date.astimezone(user_timezone)
                reminder_dt_local = datetime.combine(due_date_local.date(), task.reminder_time, tzinfo=user_timezone)
                if due_date.time() != time(0, 0) and reminder_dt_local > due_date_local:
                    reminder_dt_local = reminder_dt_local - timedelta(days=1)
                reminder_dt = reminder_dt_local.astimezone(ZoneInfo('UTC'))
            elif task.reminder_offsets:
                for offset_minutes in task.reminder_offsets:
                    due_date = task.due_date
                    if due_date.tzinfo is None:
                        due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))
                    reminder_dt = due_date - timedelta(minutes=offset_minutes)
                    if now_utc >= reminder_dt:
                        due_tasks.append(task)
                        break
                continue

            if reminder_dt and now_utc >= reminder_dt:
                due_tasks.append(task)

        return due_tasks

    async def send_reminder(self, task: Task, user: User) -> Notification:
        due_date = task.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))

        message = f'Напоминание о задаче "{task.title}"'

        notification = await self.create_notification(
            user=user,
            task=task,
            type='due_reminder',
            message=message
        )

        task.last_reminder_sent_at = datetime.now(ZoneInfo('UTC'))
        await self.db.flush()

        return notification


    async def create_notification(
        self, user: User, task: Task | None, type: str, message: str
    ) -> Notification:
        now = datetime.now(ZoneInfo('UTC'))
        expires_at = now + timedelta(days=30)

        notification = Notification(
            user_id=user.id,
            task_id=task.id if task else None,
            type=type,
            message=message,
            created_at=now,
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
            Notification.is_read == False
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Notification)
            .options(selectinload(Notification.task))
            .where(
                Notification.user_id == str(user_id),
                Notification.is_read == False
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
            notification.read_at = datetime.now(ZoneInfo('UTC'))
            await self.db.flush()

        return notification

    async def mark_all_as_read(self, user_id: str | UUID) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == str(user_id), Notification.is_read == False)
            .values(is_read=True, read_at=datetime.now(ZoneInfo('UTC')))
        )
        result = await self.db.execute(stmt)
        return result.rowcount

    def convert_to_user_timezone(self, dt: datetime, user_timezone: str) -> datetime:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo('UTC'))

        target_tz = ZoneInfo(user_timezone)
        return dt.astimezone(target_tz)

    def should_send_reminder(self, task: Task) -> bool:
        if not task.last_reminder_sent_at:
            return True

        now = datetime.now(ZoneInfo('UTC'))
        last_sent = task.last_reminder_sent_at
        if last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=ZoneInfo('UTC'))
        time_since_last_reminder = now - last_sent

        return time_since_last_reminder >= timedelta(hours=24)

    async def cleanup_expired_notifications(self, days: int = 30) -> int:
        now = datetime.now(ZoneInfo('UTC'))

        result = await self.db.execute(
            delete(Notification).where(Notification.expires_at < now)
        )
        deleted_count = result.rowcount
        await self.db.flush()
        return deleted_count
