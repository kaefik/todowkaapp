from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.task import Task
from app.models.task_recurrence import TaskRecurrence

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class RecurrenceService:
    def __init__(self, db: 'AsyncSession'):
        self.db = db

    async def generate_next_task(self, task: Task, previous_gtd_status: str | None = None) -> Task | None:
        if not task.is_recurring:
            return None

        if task.gtd_status == 'trash':
            return None

        now_aware = datetime.now(UTC)
        if task.recurrence_end_date and task.recurrence_end_date.tzinfo:
            if now_aware >= task.recurrence_end_date:
                return None
        elif task.recurrence_end_date and now_aware.replace(tzinfo=None) >= task.recurrence_end_date.replace(tzinfo=None):
            return None

        next_due_date = self.calculate_next_due_date(task)
        if next_due_date is None:
            return None

        if task.recurrence_end_date:
            end = task.recurrence_end_date.replace(tzinfo=None) if task.recurrence_end_date.tzinfo else task.recurrence_end_date
            if next_due_date > end:
                return None

        new_status = previous_gtd_status if previous_gtd_status and previous_gtd_status not in ('completed', 'trash') else 'next'

        new_task = Task(
            user_id=task.user_id,
            title=task.title,
            description=task.description,
            gtd_status=new_status,
            context_id=task.context_id,
            area_id=task.area_id,
            project_id=task.project_id,
            due_date=next_due_date,
            notes=task.notes,
            recurrence_type=task.recurrence_type,
            recurrence_config=task.recurrence_config,
            recurrence_end_date=task.recurrence_end_date,
            reminder_time=task.reminder_time,
            reminder_offsets=task.reminder_offsets,
        )

        if task.tags:
            new_task.tags = list(task.tags)

        self.db.add(new_task)
        await self.db.flush()

        await self.create_task_recurrence(task, new_task, next_due_date)

        return new_task

    async def _find_existing_generated_task(self, task_id: str, due_date: datetime) -> TaskRecurrence | None:
        stmt = select(TaskRecurrence).where(
            TaskRecurrence.task_id == task_id,
            func.date(TaskRecurrence.due_date_of_generated_task) == due_date.date(),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    def calculate_next_due_date(self, task: Task) -> datetime | None:
        if not task.due_date:
            return None

        if not task.recurrence_type or not task.recurrence_config:
            return None

        config = task.recurrence_config
        recurrence_type = task.recurrence_type

        if not isinstance(config, dict):
            return None

        base_date = task.due_date
        if base_date.tzinfo is not None:
            base_date = base_date.replace(tzinfo=None)

        interval = config.get('interval', 1)

        if not isinstance(interval, int) or interval < 1:
            return None

        if recurrence_type == 'daily':
            return base_date + timedelta(days=interval)

        if recurrence_type == 'weekly':
            days = config.get('days')
            if days and isinstance(days, list) and len(days) > 0:
                target_days = sorted(d - 1 for d in days)
                current_weekday = base_date.weekday()

                for day in target_days:
                    if day > current_weekday:
                        delta = day - current_weekday
                        return base_date + timedelta(days=delta)

                first_day = target_days[0]
                delta = (7 - current_weekday) + first_day + (7 * (interval - 1))
                return base_date + timedelta(days=delta)
            else:
                return base_date + timedelta(weeks=interval)

        if recurrence_type == 'monthly':
            day_of_month = config.get('day_of_month')
            if day_of_month and isinstance(day_of_month, int):
                try:
                    month = base_date.month + interval
                    year = base_date.year + (month - 1) // 12
                    month = ((month - 1) % 12) + 1
                    target_month = base_date.replace(year=year, month=month, day=1)
                    max_day = (target_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                    target_day = min(day_of_month, max_day.day)
                    return target_month.replace(day=target_day)
                except ValueError:
                    pass
            else:
                week_of_month = config.get('week_of_month')
                day_of_week = config.get('day_of_week')
                if week_of_month and day_of_week:
                    try:
                        target_weekday = day_of_week - 1

                        next_month = base_date.replace(day=1) + timedelta(days=32 * interval)
                        next_month = next_month.replace(day=1)
                        first_day_of_month = next_month

                        days_until_first_target = (target_weekday - first_day_of_month.weekday()) % 7
                        first_occurrence = first_day_of_month + timedelta(days=days_until_first_target)

                        if week_of_month == 1:
                            return first_occurrence
                        elif week_of_month == 2:
                            return first_occurrence + timedelta(weeks=1)
                        elif week_of_month == 3:
                            return first_occurrence + timedelta(weeks=2)
                        elif week_of_month == 4 or week_of_month == -1:
                            last_occurrence = first_occurrence + timedelta(weeks=3)
                            if last_occurrence.month != first_occurrence.month:
                                last_occurrence -= timedelta(weeks=1)
                            return last_occurrence
                    except (ValueError, TypeError):
                        pass
                return base_date + timedelta(days=32 * interval)

        if recurrence_type == 'yearly':
            month = config.get('month')
            day_of_year = config.get('day_of_month')
            target_year = base_date.year + interval

            if month is not None and isinstance(month, int) and 1 <= month <= 12:
                target_month = month
            else:
                target_month = base_date.month

            if day_of_year is not None and isinstance(day_of_year, int) and 1 <= day_of_year <= 31:
                target_day = day_of_year
            else:
                target_day = base_date.day

            try:
                target = base_date.replace(year=target_year, month=target_month, day=1)
                max_day = (target + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                return target.replace(day=min(target_day, max_day.day))
            except ValueError:
                return None

        return None

    def should_generate_task(self, task: Task) -> bool:
        if not task.is_recurring:
            return False

        if task.gtd_status == 'trash':
            return False

        if not task.due_date:
            return False

        now_aware = datetime.now(UTC)
        if task.recurrence_end_date and task.recurrence_end_date.tzinfo:
            if now_aware >= task.recurrence_end_date:
                return False
        elif task.recurrence_end_date and now_aware.replace(tzinfo=None) >= task.recurrence_end_date.replace(tzinfo=None):
            return False

        next_due_date = self.calculate_next_due_date(task)
        if next_due_date is None:
            return False

        return True

    async def create_task_recurrence(
        self, original_task: Task, generated_task: Task, due_date: datetime
    ) -> TaskRecurrence:
        recurrence = TaskRecurrence(
            id=str(uuid4()),
            task_id=original_task.id,
            generated_task_id=generated_task.id,
            due_date_of_generated_task=due_date,
            status='completed'
        )
        self.db.add(recurrence)
        await self.db.flush()
        return recurrence

    async def get_recurrence_history(
        self, task_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[TaskRecurrence], int]:
        count_stmt = select(func.count(TaskRecurrence.id)).where(TaskRecurrence.task_id == task_id)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(TaskRecurrence)
            .options(selectinload(TaskRecurrence.generated_task))
            .where(TaskRecurrence.task_id == task_id)
            .order_by(TaskRecurrence.generated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        recurrences = list(result.scalars().all())
        return recurrences, total

    async def catch_up_missed_tasks(
        self, task: Task, max_days: int = 7
    ) -> list[Task]:
        if not task.is_recurring:
            return []

        if task.gtd_status == 'trash':
            return []

        if not task.due_date:
            return []

        now_aware = datetime.now(UTC)
        if task.recurrence_end_date and task.recurrence_end_date.tzinfo:
            if now_aware >= task.recurrence_end_date:
                return []
        elif task.recurrence_end_date and now_aware.replace(tzinfo=None) >= task.recurrence_end_date.replace(tzinfo=None):
            return []

        generated_tasks = []
        current_date = task.due_date.replace(tzinfo=None) if task.due_date.tzinfo else task.due_date
        now = datetime.now()
        max_date = now + timedelta(days=max_days)

        while current_date < max_date:
            next_date = self.calculate_next_due_date(task)
            if next_date is None:
                break

            if next_date > max_date:
                break

            if task.recurrence_end_date:
                end = task.recurrence_end_date.replace(tzinfo=None) if task.recurrence_end_date.tzinfo else task.recurrence_end_date
                if next_date > end:
                    break

            if next_date <= now:
                existing = await self._find_existing_generated_task(task.id, next_date)
                if existing:
                    task.due_date = next_date
                    current_date = next_date
                    continue

                fallback_status = task.gtd_status if task.gtd_status not in ('completed', 'trash') else 'next'

                new_task = Task(
                    id=str(uuid4()),
                    user_id=task.user_id,
                    title=task.title,
                    description=task.description,
                    gtd_status=fallback_status,
                    context_id=task.context_id,
                    area_id=task.area_id,
                    project_id=task.project_id,
                    due_date=next_date,
                    notes=task.notes,
                    recurrence_type=task.recurrence_type,
                    recurrence_config=task.recurrence_config,
                    recurrence_end_date=task.recurrence_end_date,
                    reminder_time=task.reminder_time,
                    reminder_offsets=task.reminder_offsets,
                )

                if task.tags:
                    new_task.tags = list(task.tags)

                self.db.add(new_task)
                await self.db.flush()

                await self.create_task_recurrence(task, new_task, next_date)
                generated_tasks.append(new_task)

                task.due_date = next_date
                current_date = next_date
            else:
                if task.is_completed and generated_tasks:
                    task.due_date = next_date
                break

        return generated_tasks

    @staticmethod
    def validate_recurrence_config(recurrence_type: str, config: dict) -> bool:
        if not isinstance(config, dict):
            return False

        if recurrence_type not in ['daily', 'weekly', 'monthly', 'yearly', 'custom']:
            return False

        interval = config.get('interval', 1)
        if not isinstance(interval, int) or interval < 1:
            return False

        if recurrence_type == 'weekly':
            days = config.get('days')
            if days is not None:
                if not isinstance(days, list):
                    return False
                if not all(isinstance(d, int) and 1 <= d <= 7 for d in days):
                    return False
                if len(days) == 0:
                    return False

        if recurrence_type == 'monthly':
            day_of_month = config.get('day_of_month')
            week_of_month = config.get('week_of_month')
            day_of_week = config.get('day_of_week')

            if day_of_month is not None:
                if not isinstance(day_of_month, int) or day_of_month < 1 or day_of_month > 31:
                    return False
            elif week_of_month is not None and day_of_week is not None:
                if not isinstance(week_of_month, int) or week_of_month not in [1, 2, 3, 4, -1]:
                    return False
                if not isinstance(day_of_week, int) or day_of_week < 1 or day_of_week > 7:
                    return False
            else:
                return False

        if recurrence_type == 'yearly':
            month = config.get('month')
            day_of_month = config.get('day_of_month')
            if month is not None:
                if not isinstance(month, int) or month < 1 or month > 12:
                    return False
            if day_of_month is not None:
                if not isinstance(day_of_month, int) or day_of_month < 1 or day_of_month > 31:
                    return False

        return True
