from datetime import datetime, timedelta
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

    async def find_due_tasks(self) -> list[tuple[Task, int | None]]:
        now_utc = datetime.now(ZoneInfo('UTC'))

        result = await self.db.execute(
            select(Task)
            .options(
                selectinload(Task.user),
                selectinload(Task.project),
                selectinload(Task.area),
                selectinload(Task.context),
                selectinload(Task.tags)
            )
            .where(
                Task.due_date.isnot(None),
                Task.is_completed.is_(False),
                Task.reminder_fired.is_(False),
                Task.gtd_status != 'trash',
                or_(Task.reminder_time.isnot(None), Task.reminder_offsets.isnot(None)),
            )
        )
        tasks = list(result.scalars().all())

        due_tasks: list[tuple[Task, int | None]] = []
        for task in tasks:
            if not task.user:
                continue

            user_timezone = ZoneInfo(task.user.timezone or 'Europe/Moscow')

            if task.reminder_time:
                due_date = task.due_date
                if due_date.tzinfo is None:
                    due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))
                due_date_local = due_date.astimezone(user_timezone)

                reminder_time_to_use = task.reminder_time
                reminder_dt_local = datetime.combine(due_date_local.date(), reminder_time_to_use, tzinfo=user_timezone)
                reminder_dt = reminder_dt_local.astimezone(ZoneInfo('UTC'))

                if reminder_time_to_use == due_date_local.time():
                    continue

                if now_utc >= reminder_dt:
                    last_sent = task.last_reminder_sent_at
                    if last_sent and last_sent.tzinfo is None:
                        last_sent = last_sent.replace(tzinfo=ZoneInfo('UTC'))
                    if not last_sent or reminder_dt > last_sent:
                        due_tasks.append((task, None))

            elif task.reminder_offsets:
                due_date = task.due_date
                if due_date.tzinfo is None:
                    due_date = due_date.replace(tzinfo=ZoneInfo('UTC'))
                sent_offsets = set(task.sent_reminder_offsets or [])
                for offset_minutes in task.reminder_offsets:
                    if offset_minutes in sent_offsets:
                        continue
                    calculated_reminder_dt = due_date - timedelta(minutes=offset_minutes)
                    if now_utc >= calculated_reminder_dt:
                        due_tasks.append((task, offset_minutes))
                        break

        return due_tasks

    async def find_deadline_arrived_tasks(self) -> list[Task]:
        now_utc = datetime.now(ZoneInfo('UTC'))

        result = await self.db.execute(
            select(Task)
            .options(
                selectinload(Task.user),
                selectinload(Task.project),
                selectinload(Task.area),
                selectinload(Task.context),
                selectinload(Task.tags)
            )
            .where(
                Task.due_date.isnot(None),
                Task.is_completed.is_(False),
                Task.deadline_notified.is_(False),
                Task.due_date <= now_utc,
                Task.gtd_status != 'trash',
            )
        )
        return list(result.scalars().all())

    async def send_reminder(self, task: Task, user: User, offset_minutes: int | None = None) -> Notification:
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

        notification.delivered_at = datetime.now(ZoneInfo('UTC'))

        if offset_minutes is not None:
            sent = list(task.sent_reminder_offsets or [])
            sent.append(offset_minutes)
            task.sent_reminder_offsets = sent
            all_sent = set(task.reminder_offsets or []) <= set(sent)
            if all_sent:
                task.reminder_fired = True
        else:
            task.last_reminder_sent_at = datetime.now(ZoneInfo('UTC'))
            task.reminder_fired = True

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
            is_read=False,
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
            Notification.is_read.is_(False)
        )
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(Notification)
            .options(selectinload(Notification.task))
            .where(
                Notification.user_id == str(user_id),
                Notification.is_read.is_(False)
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
            .where(Notification.user_id == str(user_id), Notification.is_read.is_(False))
            .values(is_read=True, read_at=datetime.now(ZoneInfo('UTC')))
        )
        result = await self.db.execute(stmt)
        return result.rowcount

    def convert_to_user_timezone(self, dt: datetime, user_timezone: str) -> datetime:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo('UTC'))

        target_tz = ZoneInfo(user_timezone)
        return dt.astimezone(target_tz)

    async def delete_read_notifications(self, user_id: str | UUID) -> int:
        result = await self.db.execute(
            delete(Notification).where(
                Notification.user_id == str(user_id),
                Notification.is_read.is_(True)
            )
        )
        deleted_count = result.rowcount
        await self.db.flush()
        return deleted_count

    async def cleanup_expired_notifications(self, days: int = 30) -> int:
        now = datetime.now(ZoneInfo('UTC'))

        result = await self.db.execute(
            delete(Notification).where(Notification.expires_at < now)
        )
        deleted_count = result.rowcount
        await self.db.flush()
        return deleted_count
