from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tag import Tag
from app.models.task import GtdStatus, Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.search import search_condition


class TaskService:
    def __init__(self, db: Annotated[AsyncSession, "Async database session"], recurrence_service=None, reminder_service=None):
        self.db = db
        self.recurrence_service = recurrence_service
        self.reminder_service = reminder_service

    async def get_tasks(
        self,
        user_id: UUID,
        gtd_status: str | None = None,
        context_id: str | None = None,
        area_id: str | None = None,
        project_id: str | None = None,
        tag_id: str | None = None,
        is_completed: bool | None = None,
        due_date_from: datetime | None = None,
        due_date_to: datetime | None = None,
        search: str | None = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc',
        limit: int = 100,
        offset: int = 0,
        no_project: bool = False,
        case_sensitive: bool = False,
        whole_word: bool = False,
        updated_since: datetime | None = None,
    ) -> tuple[list[Task], int]:
        base_where = [Task.user_id == user_id]

        if gtd_status is not None:
            base_where.append(Task.gtd_status == gtd_status)
        if context_id is not None:
            base_where.append(Task.context_id == context_id)
        if area_id is not None:
            base_where.append(Task.area_id == area_id)
        if project_id is not None:
            base_where.append(Task.project_id == project_id)
        if no_project:
            base_where.append(Task.project_id.is_(None))
        if is_completed is not None:
            base_where.append(Task.is_completed == is_completed)
        if due_date_from is not None:
            base_where.append(Task.due_date >= due_date_from)
        if due_date_to is not None:
            base_where.append(Task.due_date <= due_date_to)
        if updated_since is not None:
            base_where.append(Task.updated_at >= updated_since)
        if search is not None:
            base_where.append(
                search_condition(
                    [Task.title, Task.description, Task.notes],
                    search,
                    case_sensitive=case_sensitive,
                    whole_word=whole_word,
                )
            )

        if tag_id is not None:
            from app.models.tag import task_tags

            count_stmt = (
                select(func.count(Task.id))
                .select_from(Task)
                .join(task_tags, Task.id == task_tags.c.task_id)
                .where(task_tags.c.tag_id == tag_id, *base_where)
            )
        else:
            count_stmt = select(func.count(Task.id)).where(*base_where)

        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        sort_column = getattr(Task, sort_by, Task.created_at)
        order = sort_column.desc() if sort_order == 'desc' else sort_column.asc()

        if tag_id is not None:
            from app.models.tag import task_tags

            result = await self.db.execute(
                select(Task)
                .options(selectinload(Task.tags), selectinload(Task.project), selectinload(Task.context))
                .join(task_tags, Task.id == task_tags.c.task_id)
                .where(task_tags.c.tag_id == tag_id, *base_where)
                .order_by(order)
                .limit(limit)
                .offset(offset)
            )
        else:
            result = await self.db.execute(
                select(Task)
                .options(selectinload(Task.tags), selectinload(Task.project), selectinload(Task.context))
                .where(*base_where)
                .order_by(order)
                .limit(limit)
                .offset(offset)
            )
        tasks = list(result.scalars().all())

        return tasks, total

    async def get_task(self, user_id: UUID, task_id: UUID | str) -> Task | None:
        result = await self.db.execute(
            select(Task)
            .options(selectinload(Task.tags), selectinload(Task.project), selectinload(Task.context))
            .where(Task.id == task_id, Task.user_id == user_id)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def _resolve_tags(self, user_id: UUID, tag_ids: list[str]) -> list[Tag]:
        result = await self.db.execute(
            select(Tag).where(
                Tag.user_id == user_id,
                Tag.id.in_(tag_ids),
            )
        )
        return list(result.scalars().all())

    async def create_task(self, user_id: UUID, data: TaskCreate) -> Task:
        import uuid as uuid_mod

        task_id = data.id if data.id else str(uuid_mod.uuid4())

        gtd_status = data.gtd_status.value if isinstance(data.gtd_status, GtdStatus) else data.gtd_status
        if data.due_date is not None and gtd_status == GtdStatus.INBOX.value:
            gtd_status = GtdStatus.ACTIVE.value

        if data.recurrence_type and not data.due_date:
            raise ValueError('due_date is required when recurrence_type is set')

        if data.recurrence_type and data.recurrence_config:
            from app.services.recurrence_service import RecurrenceService
            if not RecurrenceService.validate_recurrence_config(data.recurrence_type, data.recurrence_config):
                raise ValueError('Invalid recurrence_config for the given recurrence_type')

        task = Task(
            id=task_id,
            user_id=str(user_id),
            title=data.title,
            description=data.description,
            gtd_status=gtd_status,
            context_id=data.context_id,
            area_id=data.area_id,
            project_id=data.project_id,
            due_date=data.due_date,
            notes=data.notes,
            recurrence_type=data.recurrence_type,
            recurrence_config=data.recurrence_config,
            recurrence_end_date=data.recurrence_end_date,
            reminder_time=data.reminder_time,
            reminder_offsets=data.reminder_offsets,
        )
        if data.tag_ids:
            tags = await self._resolve_tags(user_id, data.tag_ids)
            task.tags = tags
        self.db.add(task)
        await self.db.flush()
        return await self.get_task(user_id, task.id)

    async def update_task(
        self, user_id: UUID, task_id: UUID, data: TaskUpdate
    ) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        update_data = data.model_dump(exclude_unset=True)

        effective_recurrence_type = update_data.get('recurrence_type', task.recurrence_type)
        effective_due_date = update_data.get('due_date', task.due_date)

        if effective_recurrence_type and not effective_due_date:
            raise ValueError('due_date is required when recurrence_type is set')

        if effective_recurrence_type and 'recurrence_config' in update_data and update_data['recurrence_config']:
            from app.services.recurrence_service import RecurrenceService
            if not RecurrenceService.validate_recurrence_config(effective_recurrence_type, update_data['recurrence_config']):
                raise ValueError('Invalid recurrence_config for the given recurrence_type')

        internal_fields = {'reminder_fired', 'last_reminder_sent_at', 'sent_reminder_offsets'}
        for field in internal_fields:
            update_data.pop(field, None)

        tag_ids = update_data.pop('tag_ids', None)
        if tag_ids is not None:
            tags = await self._resolve_tags(user_id, tag_ids)
            task.tags = tags

        if 'reminder_time' in update_data or 'reminder_offsets' in update_data:
            update_data['reminder_fired'] = False
            update_data['sent_reminder_offsets'] = []
            update_data['last_reminder_sent_at'] = None

        if 'gtd_status' in update_data:
            val = update_data.pop('gtd_status')
            new_status = val.value if isinstance(val, GtdStatus) else val
            update_data['gtd_status'] = new_status
            if new_status == GtdStatus.COMPLETED.value:
                update_data['is_completed'] = True
                update_data['completed_at'] = datetime.now(UTC)
            elif 'is_completed' not in update_data:
                update_data['is_completed'] = False
                update_data['completed_at'] = None

        if 'is_completed' in update_data and 'gtd_status' not in update_data:
            if update_data['is_completed'] and task.gtd_status != GtdStatus.COMPLETED.value:
                update_data['gtd_status'] = GtdStatus.COMPLETED.value
            elif not update_data['is_completed'] and task.gtd_status == GtdStatus.COMPLETED.value:
                update_data['gtd_status'] = GtdStatus.INBOX.value

        if 'due_date' in update_data:
            task.deadline_notified = False

        if 'due_date' in update_data and update_data['due_date'] is not None:
            current_status = update_data.get('gtd_status', task.gtd_status)
            if current_status == GtdStatus.INBOX.value or current_status == GtdStatus.INBOX:
                update_data['gtd_status'] = GtdStatus.ACTIVE.value

        for field, value in update_data.items():
            setattr(task, field, value)

        task.updated_at = datetime.now(UTC)

        await self.db.flush()
        return await self.get_task(user_id, task_id)

    async def move_task(self, user_id: UUID, task_id: UUID, gtd_status: GtdStatus, user: User | None = None) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        was_recurring_and_completed = task.is_recurring and task.is_completed
        was_trash = task.gtd_status == GtdStatus.TRASH.value

        task.gtd_status = gtd_status.value
        task.updated_at = datetime.now(UTC)
        if gtd_status == GtdStatus.TRASH:
            task.trashed_at = datetime.now(UTC)
            task.due_date = None
            task.reminder_time = None
            task.reminder_offsets = None
            task.reminder_fired = False
            task.sent_reminder_offsets = []
            task.last_reminder_sent_at = None
        elif gtd_status == GtdStatus.COMPLETED:
            task.is_completed = True
            task.completed_at = datetime.now(UTC)
            task.trashed_at = None
        elif task.gtd_status != GtdStatus.COMPLETED.value:
            task.is_completed = False
            task.completed_at = None
            task.trashed_at = None

        if was_trash and gtd_status != GtdStatus.TRASH:
            task.due_date = None
            task.reminder_time = None
            task.reminder_offsets = None
            task.reminder_fired = False
            task.sent_reminder_offsets = []

        await self.db.flush()

        if gtd_status == GtdStatus.COMPLETED and self.recurrence_service and not was_recurring_and_completed:
            if self.recurrence_service.should_generate_task(task):
                new_task = await self.recurrence_service.generate_next_task(task)
                await self.db.flush()

                if self.reminder_service and new_task and user:
                    notification = await self.reminder_service.create_notification(
                        user=user,
                        task=new_task,
                        type='recurrence_created',
                        message=f'Создана повторяющаяся задача: "{new_task.title}"'
                    )

                    from app.event_bus import event_bus
                    await event_bus.publish(f"{user.id}:sync", "task_updated", {
                        "task_id": str(new_task.id),
                        "action": "created",
                    })
                    await event_bus.publish(f"{user.id}:notifications", "notification_created", {
                        "notification_id": str(notification.id),
                        "type": notification.type,
                        "message": notification.message,
                        "task_id": str(new_task.id),
                        "notification_data": {
                            "id": str(notification.id),
                            "message": notification.message,
                            "created_at": notification.created_at.isoformat() if notification.created_at else None,
                            "due_date": new_task.due_date.isoformat() if new_task.due_date else None,
                        },
                    })

        return await self.get_task(user_id, task_id)

    async def reorder_task(self, user_id: UUID, task_id: UUID, position: int) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        task.position = position
        task.updated_at = datetime.now(UTC)
        await self.db.flush()
        return await self.get_task(user_id, task_id)

    async def get_gtd_counts(self, user_id: UUID) -> dict[str, int]:
        result = await self.db.execute(
            select(Task.gtd_status, func.count(Task.id))
            .where(Task.user_id == user_id)
            .group_by(Task.gtd_status)
        )
        rows = result.all()
        counts = {s.value: 0 for s in GtdStatus}
        for status_val, cnt in rows:
            counts[status_val] = cnt
        return counts

    async def toggle_task(self, user_id: UUID, task_id: UUID, user: User | None = None) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        was_completed = task.is_completed
        was_recurring_and_completed = task.is_recurring and was_completed

        task.is_completed = not task.is_completed
        task.updated_at = datetime.now(UTC)
        if task.is_completed:
            task.completed_at = datetime.now(UTC)
            task.gtd_status = GtdStatus.COMPLETED.value
        else:
            task.completed_at = None
            task.gtd_status = GtdStatus.INBOX.value
        await self.db.flush()

        if task.is_completed and not was_recurring_and_completed and self.recurrence_service:
            if self.recurrence_service.should_generate_task(task):
                new_task = await self.recurrence_service.generate_next_task(task)
                await self.db.flush()

                if self.reminder_service and new_task and user:
                    notification = await self.reminder_service.create_notification(
                        user=user,
                        task=new_task,
                        type='recurrence_created',
                        message=f'Создана повторяющаяся задача: "{new_task.title}"'
                    )

                    from app.event_bus import event_bus
                    await event_bus.publish(f"{user.id}:sync", "task_updated", {
                        "task_id": str(new_task.id),
                        "action": "created",
                    })
                    await event_bus.publish(f"{user.id}:notifications", "notification_created", {
                        "notification_id": str(notification.id),
                        "type": notification.type,
                        "message": notification.message,
                        "task_id": str(new_task.id),
                        "notification_data": {
                            "id": str(notification.id),
                            "message": notification.message,
                            "created_at": notification.created_at.isoformat() if notification.created_at else None,
                            "due_date": new_task.due_date.isoformat() if new_task.due_date else None,
                        },
                    })

        return await self.get_task(user_id, task_id)

    async def clear_trash(self, user_id: UUID) -> int:
        stmt = delete(Task).where(
            Task.user_id == user_id,
            Task.gtd_status == GtdStatus.TRASH.value,
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount

    async def clear_completed(self, user_id: UUID) -> int:
        stmt = delete(Task).where(
            Task.user_id == user_id,
            Task.gtd_status == GtdStatus.COMPLETED.value,
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount

    async def cleanup_old_trash(self, days: int = 30) -> int:
        cutoff = datetime.now(UTC) - timedelta(days=days)

        stmt = delete(Task).where(
            Task.gtd_status == GtdStatus.TRASH.value,
            Task.trashed_at.isnot(None),
            Task.trashed_at < cutoff,
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount

    async def delete_task(self, user_id: UUID, task_id: UUID) -> bool:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return False
        await self.db.delete(task)
        await self.db.flush()
        return True
