import logging
from datetime import datetime

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.task import Task

logger = logging.getLogger(__name__)


class TaskScheduler:
    def __init__(self):
        jobstores = {
            'default': SQLAlchemyJobStore(url=settings.database_url.replace('+aiosqlite', ''))
        }
        self.scheduler = AsyncIOScheduler(jobstores=jobstores, timezone='UTC')

    async def startup(self):
        if self.scheduler:
            self.scheduler.add_job(
                self._job_generate_recurring_tasks,
                'interval',
                minutes=5,
                id='generate_recurring_tasks',
                replace_existing=True
            )

            self.scheduler.add_job(
                self._job_send_due_reminders,
                'interval',
                minutes=1,
                id='send_due_reminders',
                replace_existing=True
            )

            self.scheduler.add_job(
                self._job_cleanup_old_notifications,
                'interval',
                days=1,
                id='cleanup_old_notifications',
                replace_existing=True
            )

            self.scheduler.add_job(
                self._job_startup_recovery,
                'date',
                run_date=datetime.now(),
                id='startup_recovery',
                replace_existing=True
            )

            self.scheduler.start()
            logger.info("Scheduler started")

    async def shutdown(self):
        if self.scheduler:
            self.scheduler.shutdown(wait=True)
            logger.info("Scheduler shut down")

    @staticmethod
    async def _job_generate_recurring_tasks():
        logger.info("Running job: generate_recurring_tasks")

        try:
            from app.services.recurrence_service import RecurrenceService

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Task).where(
                        Task.recurrence_type.isnot(None),
                        Task.is_completed
                    )
                )
                completed_recurring_tasks = list(result.scalars().all())

                recurrence_service = RecurrenceService(session)

                for task in completed_recurring_tasks:
                    if recurrence_service.should_generate_task(task):
                        await recurrence_service.catch_up_missed_tasks(task)
                        await session.commit()

                logger.info(f"Processed {len(completed_recurring_tasks)} completed recurring tasks")

        except Exception as e:
            logger.error(f"Error in job_generate_recurring_tasks: {e}")

    @staticmethod
    async def _job_send_due_reminders():
        logger.info("Running job: send_due_reminders")

        try:
            from app.services.reminder_service import ReminderService

            async with AsyncSessionLocal() as session:
                reminder_service = ReminderService(session)

                due_tasks = await reminder_service.find_due_tasks()
                logger.info(f"Found {len(due_tasks)} tasks with due reminders")

                for task in due_tasks:
                    try:
                        if reminder_service.should_send_reminder(task):
                            from app.models.user import User
                            result = await session.execute(
                                select(User).where(User.id == task.user_id)
                            )
                            user = result.scalar_one_or_none()

                            if user:
                                notification = await reminder_service.send_reminder(task, user)
                                logger.info(f"Sent reminder for task '{task.title}' to user {user.username}")
                                await session.commit()

                                from app.event_bus import event_bus
                                await event_bus.publish(f"{user.id}:notifications", "notification_created", {
                                    "notification_id": str(notification.id),
                                    "type": notification.type,
                                    "message": notification.message,
                                    "task_id": str(task.id) if task.id else None,
                                })
                    except Exception as e:
                        logger.error(f"Error sending reminder for task '{task.title}': {e}")
                        await session.rollback()

                logger.info(f"Processed {len(due_tasks)} due tasks for reminders")

        except Exception as e:
            logger.error(f"Error in job_send_due_reminders: {e}")

    @staticmethod
    async def _job_cleanup_old_notifications():
        logger.info("Running job: cleanup_old_notifications")

        try:
            from app.services.reminder_service import ReminderService

            async with AsyncSessionLocal() as session:
                reminder_service = ReminderService(session)

                deleted_count = await reminder_service.cleanup_expired_notifications(days=30)
                await session.commit()

                logger.info(f"Deleted {deleted_count} old notifications")

        except Exception as e:
            logger.error(f"Error in cleanup_old_notifications: {e}")

    @staticmethod
    async def _job_startup_recovery():
        logger.info("Running job: startup_recovery")

        try:
            from app.services.recurrence_service import RecurrenceService

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Task).where(
                        Task.recurrence_type.isnot(None),
                        Task.due_date.isnot(None)
                    )
                )
                recurring_tasks = list(result.scalars().all())

                recurrence_service = RecurrenceService(session)

                total_generated = 0
                for task in recurring_tasks:
                    generated_tasks = await recurrence_service.catch_up_missed_tasks(task, max_days=7)
                    total_generated += len(generated_tasks)

                await session.commit()
                logger.info(f"Startup recovery: generated {total_generated} missed tasks")

        except Exception as e:
            logger.error(f"Error in job_startup_recovery: {e}")


task_scheduler = TaskScheduler()
