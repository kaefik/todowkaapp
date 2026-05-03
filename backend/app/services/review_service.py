from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.review_snapshot import ReviewSnapshot
from app.models.task import GtdStatus, Task
from app.models.user import User

STALE_DAYS = 14


def _compute_health(projects_without_next: int, overdue: int, inbox: int) -> str:
    problems = 0
    if projects_without_next > 0:
        problems += projects_without_next
    if overdue > 0:
        problems += 1
    if inbox > 10:
        problems += 1
    if problems == 0:
        return 'ok'
    if problems <= 2:
        return 'attention'
    return 'problems'


class ReviewService:
    def __init__(self, db: Annotated[AsyncSession, 'Async database session']):
        self.db = db

    async def _get_user(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def _count_tasks(self, user_id: str, *conditions) -> int:
        result = await self.db.execute(
            select(func.count(Task.id)).where(Task.user_id == user_id, *conditions)
        )
        return result.scalar() or 0

    async def get_summary(self, user_id: str) -> dict:
        user = await self._get_user(user_id)
        now = datetime.now(UTC)
        week_ago = now - timedelta(days=7)
        stale_cutoff = now - timedelta(days=STALE_DAYS)

        inbox_count = await self._count_tasks(user_id, Task.gtd_status == GtdStatus.INBOX.value)

        overdue_count = await self._count_tasks(
            user_id,
            Task.due_date < now,
            Task.gtd_status.notin_([GtdStatus.COMPLETED.value, GtdStatus.TRASH.value]),
        )

        done_this_week = await self._count_tasks(
            user_id,
            Task.completed_at >= week_ago,
            Task.gtd_status == GtdStatus.COMPLETED.value,
        )

        stale_count = await self._count_tasks(
            user_id,
            Task.gtd_status.in_([GtdStatus.ACTIVE.value, GtdStatus.NEXT.value]),
            Task.updated_at < stale_cutoff,
        )

        projects_without_next_result = await self.db.execute(
            select(Project.id, Project.name)
            .where(Project.user_id == user_id, Project.is_active)
            .where(
                ~Project.id.in_(
                    select(Task.project_id).where(
                        Task.user_id == user_id,
                        Task.gtd_status.in_([GtdStatus.ACTIVE.value, GtdStatus.NEXT.value]),
                        Task.project_id.isnot(None),
                    ).correlate(Project)
                )
            )
        )
        problem_projects = projects_without_next_result.all()
        projects_without_next = len(problem_projects)

        health_status = _compute_health(projects_without_next, overdue_count, inbox_count)

        week_activity_result = await self.db.execute(
            select(func.strftime('%w', Task.completed_at), func.count(Task.id))
            .where(Task.user_id == user_id, Task.completed_at >= week_ago)
            .group_by(func.strftime('%w', Task.completed_at))
        )
        day_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        week_activity = {day_names[int(row[0])]: row[1] for row in week_activity_result.all()}

        alerts: list[dict] = []

        for proj in problem_projects:
            days_result = await self.db.execute(
                select(func.min(Task.updated_at)).where(
                    Task.project_id == proj.id,
                    Task.user_id == user_id,
                )
            )
            oldest_update = days_result.scalar_one_or_none()
            days_without = 0
            if oldest_update:
                days_without = (now - oldest_update).days
            alerts.append({
                'severity': 'red',
                'message': f'{proj.name} — нет next action ({days_without} дн.)',
                'project_id': proj.id,
            })

        old_someday_count = await self._count_tasks(
            user_id,
            Task.gtd_status == GtdStatus.SOMEDAY.value,
            Task.created_at < stale_cutoff,
        )
        if old_someday_count > 0:
            alerts.append({
                'severity': 'yellow',
                'message': f'{old_someday_count} someday задач без движения > {STALE_DAYS} дней',
            })

        if overdue_count > 0:
            alerts.append({
                'severity': 'yellow',
                'message': f'{overdue_count} задач просрочены',
            })

        someday_count = await self._count_tasks(
            user_id,
            Task.gtd_status == GtdStatus.SOMEDAY.value,
        )

        return {
            'inbox_count': inbox_count,
            'overdue_count': overdue_count,
            'done_this_week': done_this_week,
            'stale_count': stale_count,
            'someday_count': someday_count,
            'projects_without_next': projects_without_next,
            'health_status': health_status,
            'last_review_date': user.last_review_at.isoformat() if user and user.last_review_at else None,
            'review_count': user.review_count if user else 0,
            'review_frequency_days': user.review_frequency_days if user else 7,
            'week_activity': week_activity,
            'alerts': alerts,
        }

    async def get_review_status(self, user_id: str) -> dict:
        user = await self._get_user(user_id)
        now = datetime.now(UTC)

        inbox_result = await self.db.execute(
            select(Task.id, Task.title, Task.description, Task.due_date, Task.created_at).where(
                Task.user_id == user_id,
                Task.gtd_status == GtdStatus.INBOX.value,
            )
        )
        inbox_tasks = [
            {
                'id': row.id,
                'title': row.title,
                'description': row.description,
                'due_date': row.due_date.isoformat() if row.due_date else None,
                'created_at': row.created_at.isoformat() if row.created_at else None,
            }
            for row in inbox_result.all()
        ]

        projects_result = await self.db.execute(
            select(Project).where(Project.user_id == user_id, Project.is_active)
        )
        active_projects = []
        for project in projects_result.scalars().all():
            next_actions_result = await self.db.execute(
                select(Task.id, Task.title, Task.description, Task.due_date, Task.created_at).where(
                    Task.project_id == project.id,
                    Task.gtd_status.in_([GtdStatus.ACTIVE.value, GtdStatus.NEXT.value]),
                    Task.user_id == user_id,
                )
            )
            next_actions = [
                {
                    'id': row.id,
                    'title': row.title,
                    'description': row.description,
                    'due_date': row.due_date.isoformat() if row.due_date else None,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                }
                for row in next_actions_result.all()
            ]

            available_result = await self.db.execute(
                select(Task.id, Task.title, Task.description, Task.due_date, Task.created_at).where(
                    Task.project_id == project.id,
                    Task.gtd_status.in_([GtdStatus.SOMEDAY.value, GtdStatus.WAITING.value]),
                    Task.user_id == user_id,
                )
            )
            available_tasks = [
                {
                    'id': row.id,
                    'title': row.title,
                    'description': row.description,
                    'due_date': row.due_date.isoformat() if row.due_date else None,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                }
                for row in available_result.all()
            ]

            has_next_action = len(next_actions) > 0

            days_without_next = 0
            if not has_next_action:
                oldest_result = await self.db.execute(
                    select(func.min(Task.updated_at)).where(
                        Task.project_id == project.id,
                        Task.user_id == user_id,
                    )
                )
                oldest = oldest_result.scalar_one_or_none()
                if oldest:
                    days_without_next = (now - oldest).days

            active_projects.append({
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'has_next_action': has_next_action,
                'days_without_next': days_without_next,
                'next_actions': next_actions,
                'available_tasks': available_tasks,
            })

        someday_result = await self.db.execute(
            select(Task.id, Task.title, Task.description, Task.due_date, Task.created_at).where(
                Task.user_id == user_id,
                Task.gtd_status == GtdStatus.SOMEDAY.value,
            )
        )
        someday_tasks = [
            {
                'id': row.id,
                'title': row.title,
                'description': row.description,
                'due_date': row.due_date.isoformat() if row.due_date else None,
                'created_at': row.created_at.isoformat() if row.created_at else None,
            }
            for row in someday_result.all()
        ]

        overdue_result = await self.db.execute(
            select(
                Task.id, Task.title, Task.description, Task.due_date,
                Task.gtd_status, Task.project_id, Project.name,
            )
            .outerjoin(Project, Task.project_id == Project.id)
            .where(
                Task.user_id == user_id,
                Task.due_date < now,
                Task.gtd_status.notin_([GtdStatus.COMPLETED.value, GtdStatus.TRASH.value]),
            )
            .order_by(Task.due_date.asc())
        )
        overdue_tasks = [
            {
                'id': row.id,
                'title': row.title,
                'description': row.description,
                'due_date': row.due_date.isoformat() if row.due_date else None,
                'gtd_status': row.gtd_status,
                'project_name': row.name,
            }
            for row in overdue_result.all()
        ]

        inbox_count = len(inbox_tasks)

        return {
            'inbox_count': inbox_count,
            'inbox_tasks': inbox_tasks,
            'overdue_tasks': overdue_tasks,
            'active_projects': active_projects,
            'someday_tasks': someday_tasks,
            'last_review_date': user.last_review_at.isoformat() if user and user.last_review_at else None,
            'review_count': user.review_count if user else 0,
        }

    async def complete_review(self, user_id: str, stats: dict | None = None) -> dict:
        user = await self._get_user(user_id)
        if user is None:
            return {'success': False, 'error': 'User not found'}

        now = datetime.now(UTC)
        user.last_review_at = now
        user.review_count = (user.review_count or 0) + 1

        summary = await self.get_summary(user_id)

        snapshot = ReviewSnapshot(
            id=str(uuid4()),
            user_id=user_id,
            created_at=now,
            inbox_count=summary['inbox_count'],
            overdue_count=summary['overdue_count'],
            done_count=summary['done_this_week'],
            stale_count=summary['stale_count'],
            projects_without_next=summary['projects_without_next'],
            health_status=summary['health_status'],
            inbox_processed=stats.get('inbox_processed', 0) if stats else 0,
            next_actions_added=stats.get('next_actions_added', 0) if stats else 0,
            someday_activated=stats.get('someday_activated', 0) if stats else 0,
        )
        self.db.add(snapshot)
        await self.db.flush()

        return {
            'success': True,
            'review_count': user.review_count,
            'completed_at': now.isoformat(),
            'snapshot_health': summary['health_status'],
        }
