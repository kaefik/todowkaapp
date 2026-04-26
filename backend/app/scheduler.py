import logging
from datetime import datetime

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.task import Task
from app.models.user import User

logger = logging.getLogger(__name__)


class TaskScheduler:
    def __init__(self):
        jobstores = {
            'default': SQLAlchemyJobStore(url=settings.database_url.replace('+aiosqlite', ''))
        }
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            timezone='UTC',
            job_defaults={'misfire_grace_time': 300, 'coalesce': True},
        )

    async def startup(self):
        if self.scheduler:
            self.scheduler.add_job(
                self._job_generate_recurring_tasks,
                'interval',
                minutes=5,
                id='generate_recurring_tasks',
                replace_existing=True,
                max_instances=1
            )

            self.scheduler.add_job(
                self._job_send_due_reminders,
                'interval',
                minutes=1,
                id='send_due_reminders',
                replace_existing=True,
                max_instances=1
            )

            self.scheduler.add_job(
                self._job_send_deadline_notifications,
                'interval',
                minutes=1,
                id='send_deadline_notifications',
                replace_existing=True,
                max_instances=1
            )

            self.scheduler.add_job(
                self._job_cleanup_old_notifications,
                'interval',
                days=1,
                id='cleanup_old_notifications',
                replace_existing=True,
                max_instances=1
            )

            self.scheduler.add_job(
                self._job_startup_recovery,
                'date',
                run_date=datetime.now(),
                id='startup_recovery',
                replace_existing=True,
                max_instances=1
            )

            self.scheduler.add_job(
                self._job_cleanup_old_trash,
                'interval',
                days=1,
                id='cleanup_old_trash',
                replace_existing=True,
                max_instances=1
            )

            self.scheduler.add_job(
                self._job_reminder_recovery,
                'date',
                run_date=datetime.now(),
                id='reminder_recovery',
                replace_existing=True,
                max_instances=1,
            )

            self.scheduler.add_job(
                _job_poll_telegram_bots,
                'interval',
                seconds=5,
                id='poll_telegram_bots',
                replace_existing=True,
                max_instances=1,
            )

            self.scheduler.start()
            logger.info("Scheduler started")

    @staticmethod
    async def _job_reminder_recovery():
        logger.info("Running job: reminder_recovery")

        try:
            from app.services.reminder_service import ReminderService

            async with AsyncSessionLocal() as session:
                reminder_service = ReminderService(session)

                due_items = await reminder_service.find_due_tasks()
                logger.info(f"Recovery: found {len(due_items)} missed reminders")

                sent_count = 0
                for task, offset_minutes in due_items:
                    try:
                        if task.user:
                            notification = await reminder_service.send_reminder(
                                task, task.user, offset_minutes
                            )
                            await session.commit()

                            from app.event_bus import event_bus
                            logger.info(f"Publishing notification {notification.id} for user {task.user.id}")
                            await event_bus.publish(
                                f"{task.user.id}:notifications",
                                "notification_created",
                                {
                                    "notification_id": str(notification.id),
                                    "type": notification.type,
                                    "message": notification.message,
                                    "task_id": str(task.id) if task.id else None,
                                    "notification_data": {
                                        "id": str(notification.id),
                                        "message": notification.message,
                                        "created_at": notification.created_at.isoformat() if notification.created_at else None,
                                        "due_date": task.due_date.isoformat() if task.due_date else None
                                    }
                                }
                            )

                            if (
                                task.user.telegram_notifications_enabled
                                and task.user.telegram_chat_id
                                and task.user.telegram_bot_token
                            ):
                                try:
                                    from app.services.telegram_notifier import (
                                        TelegramNotifierService,
                                    )

                                    await TelegramNotifierService.send_reminder(
                                        task.user, task
                                    )
                                except Exception as tg_err:
                                    logger.error(
                                        f"Telegram send failed for user {task.user.username}: {tg_err}"
                                    )

                            sent_count += 1
                    except Exception as e:
                        logger.error(f"Recovery error for task '{task.title}': {e}")
                        await session.rollback()

                logger.info(f"Recovery: sent {sent_count} missed reminders")

        except Exception as e:
            logger.error(f"Error in reminder_recovery: {e}")

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

                due_items = await reminder_service.find_due_tasks()
                logger.info(f"Found {len(due_items)} tasks with due reminders")

                for task, offset_minutes in due_items:
                    try:
                        user = task.user

                        if user:
                            notification = await reminder_service.send_reminder(task, user, offset_minutes)
                            logger.info(f"Sent reminder for task '{task.title}' to user {user.username}")
                            await session.commit()

                            from app.event_bus import event_bus
                            logger.info(f"Publishing notification {notification.id} for user {user.id}")
                            await event_bus.publish(f"{user.id}:notifications", "notification_created", {
                                "notification_id": str(notification.id),
                                "type": notification.type,
                                "message": notification.message,
                                "task_id": str(task.id) if task.id else None,
                                "notification_data": {
                                    "id": str(notification.id),
                                    "message": notification.message,
                                    "created_at": notification.created_at.isoformat() if notification.created_at else None,
                                    "due_date": task.due_date.isoformat() if task.due_date else None
                                }
                            })

                            if (
                                user.telegram_notifications_enabled
                                and user.telegram_chat_id
                                and user.telegram_bot_token
                            ):
                                try:
                                    from app.services.telegram_notifier import (
                                        TelegramNotifierService,
                                    )

                                    await TelegramNotifierService.send_reminder(user, task)
                                except Exception as tg_err:
                                    logger.error(
                                        f"Telegram send failed for user {user.username}: {tg_err}"
                                    )
                    except Exception as e:
                        logger.error(f"Error sending reminder for task '{task.title}': {e}")
                        await session.rollback()

                logger.info(f"Processed {len(due_items)} due tasks for reminders")

        except Exception as e:
            logger.error(f"Error in job_send_due_reminders: {e}")

    @staticmethod
    async def _job_send_deadline_notifications():
        logger.info("Running job: send_deadline_notifications")

        try:
            from app.services.reminder_service import ReminderService

            async with AsyncSessionLocal() as session:
                reminder_service = ReminderService(session)

                tasks = await reminder_service.find_deadline_arrived_tasks()
                logger.info(f"Found {len(tasks)} tasks with arrived deadlines")

                for task in tasks:
                    try:
                        user = task.user
                        if not user:
                            continue

                        rs = ReminderService(session)
                        message = f'Дедлайн задачи "{task.title}" наступил'
                        notification = await rs.create_notification(
                            user=user,
                            task=task,
                            type='deadline_arrived',
                            message=message
                        )
                        task.deadline_notified = True
                        await session.commit()

                        from app.event_bus import event_bus
                        await event_bus.publish(f"{user.id}:notifications", "notification_created", {
                            "notification_id": str(notification.id),
                            "type": notification.type,
                            "message": notification.message,
                            "task_id": str(task.id) if task.id else None,
                            "notification_data": {
                                "id": str(notification.id),
                                "message": notification.message,
                                "created_at": notification.created_at.isoformat() if notification.created_at else None,
                                "due_date": task.due_date.isoformat() if task.due_date else None
                            }
                        })

                        if (
                            user.telegram_notifications_enabled
                            and user.telegram_chat_id
                            and user.telegram_bot_token
                        ):
                            try:
                                from app.services.telegram_notifier import TelegramNotifierService
                                await TelegramNotifierService.send_message(
                                    user.telegram_bot_token,
                                    user.telegram_chat_id,
                                    f'⏰ Дедлайн задачи "{task.title}" наступил!',
                                )
                            except Exception as tg_err:
                                logger.error(f"Telegram deadline send failed for user {user.username}: {tg_err}")

                    except Exception as e:
                        logger.error(f"Error sending deadline notification for task '{task.title}': {e}")
                        await session.rollback()

        except Exception as e:
            logger.error(f"Error in job_send_deadline_notifications: {e}")

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

    @staticmethod
    async def _job_cleanup_old_trash():
        logger.info("Running job: cleanup_old_trash")

        try:
            from app.services.task_service import TaskService

            async with AsyncSessionLocal() as session:
                task_service = TaskService(session)
                deleted_count = await task_service.cleanup_old_trash(days=30)
                await session.commit()
                logger.info(f"Deleted {deleted_count} tasks from trash older than 30 days")

        except Exception as e:
            logger.error(f"Error in cleanup_old_trash: {e}")


task_scheduler = TaskScheduler()

_telegram_poll_offsets: dict[str, int] = {}


async def _job_poll_telegram_bots():
    logger.info("Running job: poll_telegram_bots")

    try:
        from app.services.telegram_notifier import TelegramNotifierService

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(
                    User.telegram_bot_token.isnot(None),
                    User.telegram_bot_token != '',
                    User.telegram_chat_id.is_(None),
                )
            )
            users = list(result.scalars().all())

            for user in users:
                try:
                    offset = _telegram_poll_offsets.get(str(user.id))
                    updates, new_offset = await TelegramNotifierService.poll_updates(
                        user.telegram_bot_token, offset
                    )
                    if new_offset is not None:
                        _telegram_poll_offsets[str(user.id)] = new_offset

                    for upd in updates:
                        message = upd.get("message", {})
                        text = message.get("text", "").strip()
                        chat_id = str(message.get("chat", {}).get("id", ""))

                        if text == "/start" and chat_id:
                            user.telegram_chat_id = chat_id
                            user.telegram_notifications_enabled = True
                            await session.commit()
                            logger.info(
                                f"Telegram chat_id {chat_id} linked for user {user.username}"
                            )

                            await TelegramNotifierService.send_message(
                                user.telegram_bot_token,
                                chat_id,
                                "\u2705 Бот Todowka подключён! Теперь вы будете получать напоминания о задачах.",
                            )
                            break

                except Exception as e:
                    logger.error(f"Error polling bot for user {user.id}: {e}")

    except Exception as e:
        logger.error(f"Error in poll_telegram_bots: {e}")
