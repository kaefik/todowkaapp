from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.task import Task
from app.models.task_recurrence import TaskRecurrence

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class RecurrenceService:
    def __init__(self, db: 'AsyncSession'):
        self.db = db

    async def generate_next_task(self, task: Task) -> Task | None:
        if not task.is_recurring:
            return None

        if task.recurrence_end_date and datetime.now(task.recurrence_end_date.tzinfo) >= task.recurrence_end_date:
            return None

        next_due_date = self.calculate_next_due_date(task)
        if next_due_date is None:
            return None

        if task.recurrence_end_date and next_due_date > task.recurrence_end_date:
            return None

        new_task = Task(
            user_id=task.user_id,
            title=task.title,
            description=task.description,
            gtd_status='next',
            context_id=task.context_id,
            area_id=task.area_id,
            project_id=task.project_id,
            due_date=next_due_date,
            notes=task.notes,
            recurrence_type=task.recurrence_type,
            recurrence_config=task.recurrence_config,
            recurrence_end_date=task.recurrence_end_date,
            reminder_offsets=task.reminder_offsets,
        )

        self.db.add(new_task)
        await self.db.flush()

        await self.create_task_recurrence(task, new_task, next_due_date)

        return new_task

    def calculate_next_due_date(self, task: Task) -> datetime | None:
        if not task.due_date:
            return None

        if not task.recurrence_type or not task.recurrence_config:
            return None

        config = task.recurrence_config
        recurrence_type = task.recurrence_type

        if not isinstance(config, dict):
            return None

        base_date = task.due_date.replace(tzinfo=None)
        interval = config.get('interval', 1)

        if not isinstance(interval, int) or interval < 1:
            return None

        if recurrence_type == 'daily':
            return base_date + timedelta(days=interval)

        if recurrence_type == 'weekly':
            days = config.get('days')
            if days and isinstance(days, list):
                target_days = sorted(days)
                current_weekday = base_date.weekday()

                for day in target_days:
                    if day > current_weekday:
                        delta = day - current_weekday
                        return base_date + timedelta(days=delta)

                first_day = target_days[0]
                delta = (7 - current_weekday) + first_day
                return base_date + timedelta(days=delta)
            else:
                return base_date + timedelta(weeks=interval)

        if recurrence_type == 'monthly':
            day_of_month = config.get('day_of_month')
            if day_of_month and isinstance(day_of_month, int):
                try:
                    next_month = base_date.replace(day=1) + timedelta(days=32)
                    next_month = next_month.replace(day=1)
                    max_day = (next_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                    target_day = min(day_of_month, max_day.day)
                    return next_month.replace(day=target_day)
                except ValueError:
                    pass
            else:
                week_of_month = config.get('week_of_month')
                day_of_week = config.get('day_of_week')
                if week_of_month and day_of_week:
                    try:
                        next_month = base_date.replace(day=1) + timedelta(days=32)
                        next_month = next_month.replace(day=1)
                        first_day_of_month = next_month

                        target_weekday = day_of_week - 1
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
                return base_date + timedelta(days=32)

        return None

    def should_generate_task(self, task: Task) -> bool:
        if not task.is_recurring:
            return False

        if not task.due_date:
            return False

        if task.recurrence_end_date and datetime.now(task.recurrence_end_date.tzinfo) >= task.recurrence_end_date:
            return False

        next_due_date = self.calculate_next_due_date(task)
        if next_due_date is None:
            return False

        return True

    async def create_task_recurrence(
        self, original_task: Task, generated_task: Task, due_date: datetime
    ) -> TaskRecurrence:
        recurrence = TaskRecurrence(
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
        count_stmt = select(TaskRecurrence).where(TaskRecurrence.task_id == task_id)
        count_result = await self.db.execute(select(count_stmt))
        total = len(list(count_result.scalars().all()))

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

        if not task.due_date:
            return []

        if task.recurrence_end_date and datetime.now(task.recurrence_end_date.tzinfo) >= task.recurrence_end_date:
            return []

        generated_tasks = []
        current_date = task.due_date.replace(tzinfo=None)
        now = datetime.now()
        max_date = now + timedelta(days=7)

        while current_date < max_date:
            next_date = self.calculate_next_due_date(task)
            if next_date is None:
                break

            if next_date > max_date:
                break

            if task.recurrence_end_date and next_date > task.recurrence_end_date:
                break

            if next_date <= now:
                new_task = Task(
                    user_id=task.user_id,
                    title=task.title,
                    description=task.description,
                    gtd_status='next',
                    context_id=task.context_id,
                    area_id=task.area_id,
                    project_id=task.project_id,
                    due_date=next_date,
                    notes=task.notes,
                    recurrence_type=task.recurrence_type,
                    recurrence_config=task.recurrence_config,
                    recurrence_end_date=task.recurrence_end_date,
                    reminder_offsets=task.reminder_offsets,
                )

                self.db.add(new_task)
                await self.db.flush()

                await self.create_task_recurrence(task, new_task, next_date)
                generated_tasks.append(new_task)

                task.due_date = next_date

            current_date = next_date

        return generated_tasks

    def validate_recurrence_config(self, config: dict) -> bool:
        if not isinstance(config, dict):
            return False

        recurrence_type = config.get('type')
        if recurrence_type not in ['daily', 'weekly', 'monthly', 'custom']:
            return False

        interval = config.get('interval', 1)
        if not isinstance(interval, int) or interval < 1:
            return False

        if recurrence_type == 'weekly':
            days = config.get('days')
            if days is not None:
                if not isinstance(days, list):
                    return False
                if not all(isinstance(d, int) and 0 <= d <= 6 for d in days):
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

        return True
