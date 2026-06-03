import asyncio
import logging
import threading
from datetime import datetime, timedelta

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.i18n import t as i18n_t
from app.models.revoked_token import RevokedToken
from app.models.task import Task
from app.models.user import User

logger = logging.getLogger(__name__)


class TaskScheduler:
    def __init__(self):
        from pathlib import Path
        scheduler_db_path = str(Path(__file__).parent.parent / "data" / "scheduler.db")
        jobstores = {
            'default': SQLAlchemyJobStore(url=f'sqlite:///{scheduler_db_path}')
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
                self._job_generate_recurring_events,
                'interval',
                minutes=5,
                id='generate_recurring_events',
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
                self._job_startup_recovery_events,
                'date',
                run_date=datetime.now(),
                id='startup_recovery_events',
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
                self._job_cleanup_old_tombstones,
                'interval',
                days=1,
                id='cleanup_old_tombstones',
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

            self.scheduler.add_job(
                _job_send_backup_schedules,
                'interval',
                minutes=1,
                id='send_backup_schedules',
                replace_existing=True,
                max_instances=1,
            )

            self.scheduler.add_job(
                self._job_cleanup_revoked_tokens,
                'interval',
                days=1,
                id='cleanup_revoked_tokens',
                replace_existing=True,
                max_instances=1,
            )

            self.scheduler.add_job(
                _job_send_daily_digests,
                'interval',
                minutes=1,
                id='send_daily_digests',
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
                await session.commit()

                sent_count = 0
                for task, offset_minutes in due_items:
                    try:
                        if task.user:
                            notification = await reminder_service.send_reminder(
                                task, task.user, offset_minutes
                            )
                            await session.commit()

                            from app.event_bus import event_bus
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

                                if (
                                    task.user.email_notifications_enabled
                                    and task.user.notification_email
                                ):
                                    try:
                                        from app.config import settings
                                        from app.services.email_service import (
                                            get_email_service_from_db,
                                        )

                                        async with AsyncSessionLocal() as email_db:
                                            email_service = await get_email_service_from_db(email_db)
                                            if email_service and task.due_date:
                                                await email_service.send_deadline_reminder(
                                                task.user.notification_email,
                                                task.title,
                                                task.due_date,
                                                task.user.username,
                                                settings.frontend_url,
                                            )
                                    except Exception as em_err:
                                        logger.error(
                                            f"Email send failed for user {task.user.username}: {em_err}"
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
    async def _job_cleanup_revoked_tokens():
        logger.info("Running job: cleanup_revoked_tokens")

        try:
            from app.config import settings

            async with AsyncSessionLocal() as session:
                cutoff = datetime.now() - timedelta(days=settings.refresh_token_expire_days)
                result = await session.execute(
                    delete(RevokedToken).where(RevokedToken.revoked_at < cutoff)
                )
                await session.commit()
                logger.info(f"Deleted {result.rowcount} expired revoked tokens (older than {settings.refresh_token_expire_days} days)")

        except Exception as e:
            logger.error(f"Error in cleanup_revoked_tokens: {e}")

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
    async def _job_generate_recurring_events():
        logger.info("Running job: generate_recurring_events")

        try:
            from app.models.calendar_event import CalendarEvent
            from app.services.event_recurrence_service import EventRecurrenceService

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(CalendarEvent).where(
                        CalendarEvent.recurrence_type.isnot(None),
                        CalendarEvent.start_time.isnot(None)
                    )
                )
                recurring_events = list(result.scalars().all())

                recurrence_service = EventRecurrenceService(session)

                generated_count = 0
                for event in recurring_events:
                    if recurrence_service.should_generate_event(event):
                        new_event = await recurrence_service.generate_next_event(event)
                        if new_event:
                            generated_count += 1

                await session.commit()
                logger.info(f"Generated {generated_count} new events from {len(recurring_events)} recurring events")

        except Exception as e:
            logger.error(f"Error in job_generate_recurring_events: {e}")

    @staticmethod
    async def _job_send_due_reminders():
        logger.info("Running job: send_due_reminders")

        try:
            from app.services.reminder_service import ReminderService

            async with AsyncSessionLocal() as session:
                reminder_service = ReminderService(session)

                due_items = await reminder_service.find_due_tasks()
                logger.info(f"Found {len(due_items)} tasks with due reminders")
                await session.commit()

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

                            if (
                                user.email_notifications_enabled
                                and user.notification_email
                            ):
                                try:
                                    from app.config import settings
                                    from app.services.email_service import (
                                        get_email_service_from_db,
                                    )

                                    email_service = await get_email_service_from_db(session)
                                    if email_service and task.due_date:
                                        await email_service.send_deadline_reminder(
                                            user.notification_email,
                                            task.title,
                                            task.due_date,
                                            user.username,
                                            settings.frontend_url,
                                        )
                                except Exception as em_err:
                                    logger.error(
                                        f"Email send failed for user {user.username}: {em_err}"
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
                        lang = getattr(user, 'language', None) or "ru"
                        message = i18n_t('deadlineArrived', lang, title=task.title)
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
                                from app.config import settings
                                from app.services.telegram_notifier import TelegramNotifierService
                                task_link = TelegramNotifierService._build_task_link(task.id, settings.frontend_url, lang)
                                await TelegramNotifierService.send_message(
                                    user.decrypted_telegram_bot_token,
                                    user.telegram_chat_id,
                                    f'{i18n_t("deadlineArrivedTelegram", lang, title=task.title)}\n\n{task_link}',
                                )
                            except Exception as tg_err:
                                logger.error(f"Telegram deadline send failed for user {user.username}: {tg_err}")

                        if (
                            user.email_notifications_enabled
                            and user.notification_email
                        ):
                            try:
                                from app.config import settings
                                from app.services.email_service import (
                                    get_email_service_from_db,
                                )

                                email_service = await get_email_service_from_db(session)
                                if email_service and task.due_date:
                                    await email_service.send_deadline_reminder(
                                        user.notification_email,
                                        task.title,
                                        task.due_date,
                                        user.username,
                                        settings.frontend_url,
                                    )
                            except Exception as em_err:
                                logger.error(f"Email deadline send failed for user {user.username}: {em_err}")

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
                        Task.due_date.isnot(None),
                        Task.is_completed
                    )
                )
                recurring_tasks = list(result.scalars().all())

                recurrence_service = RecurrenceService(session)

                total_generated = 0
                for task in recurring_tasks:
                    generated_tasks = await recurrence_service.catch_up_missed_tasks(task, max_days=7)
                    total_generated += len(generated_tasks)

                await session.commit()
                logger.info(f"Startup recovery: generated {total_generated} missed tasks from {len(recurring_tasks)} recurring tasks")

        except Exception as e:
            logger.error(f"Error in job_startup_recovery: {e}")

    @staticmethod
    async def _job_startup_recovery_events():
        logger.info("Running job: startup_recovery_events")

        try:
            from app.models.calendar_event import CalendarEvent
            from app.services.event_recurrence_service import EventRecurrenceService

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(CalendarEvent).where(
                        CalendarEvent.recurrence_type.isnot(None),
                        CalendarEvent.start_time.isnot(None),
                    )
                )
                recurring_events = list(result.scalars().all())

                recurrence_service = EventRecurrenceService(session)

                total_generated = 0
                for event in recurring_events:
                    if recurrence_service.is_event_passed(event):
                        generated = await recurrence_service.catch_up_missed_events(event, max_days=7)
                        total_generated += len(generated)

                await session.commit()
                logger.info(f"Startup recovery events: generated {total_generated} missed events from {len(recurring_events)} recurring events")

        except Exception as e:
            logger.error(f"Error in job_startup_recovery_events: {e}")

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

    @staticmethod
    async def _job_cleanup_old_tombstones():
        logger.info("Running job: cleanup_old_tombstones")

        try:
            from app.models.deleted_entity import DeletionService

            async with AsyncSessionLocal() as session:
                deletion_service = DeletionService(session)
                await deletion_service.cleanup_old(days=30)
                await session.commit()
                logger.info("Cleaned up tombstones older than 30 days")

        except Exception as e:
            logger.error(f"Error in cleanup_old_tombstones: {e}")


task_scheduler = TaskScheduler()

_telegram_poll_offsets: dict[str, int] = {}
_polling_thread: threading.Thread | None = None


async def _do_poll_telegram_bots():
    from app.services.telegram_notifier import TelegramNotifierService

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(
                User.telegram_bot_token.isnot(None),
                User.telegram_bot_token != '',
            )
        )
        users = list(result.scalars().all())

        for user in users:
            try:
                bot_token = user.decrypted_telegram_bot_token
                offset = _telegram_poll_offsets.get(str(user.id))
                updates, new_offset = await TelegramNotifierService.poll_updates(
                    bot_token, offset
                )
                if new_offset is not None:
                    _telegram_poll_offsets[str(user.id)] = new_offset

                from app.services.telegram_command_service import TelegramCommandService

                cmd_service = TelegramCommandService()

                for upd in updates:
                    callback_query = upd.get("callback_query")
                    if callback_query:
                        if user.telegram_chat_id:
                            await cmd_service.handle_callback(user, callback_query, session)
                            await session.commit()
                        continue

                    message = upd.get("message", {})
                    text = message.get("text", "").strip()
                    chat_id = str(message.get("chat", {}).get("id", ""))

                    if not text or not chat_id:
                        continue

                    if text == "/start":
                        if not user.telegram_chat_id:
                            user.telegram_chat_id = chat_id
                            user.telegram_notifications_enabled = True
                            await session.commit()
                            logger.info(
                                f"Telegram chat_id {chat_id} linked for user {user.username}"
                            )
                            lang = getattr(user, 'language', None) or "ru"
                            await TelegramNotifierService.send_message(
                                bot_token,
                                chat_id,
                                i18n_t("telegramBotConnected", lang),
                            )
                        else:
                            lang = getattr(user, 'language', None) or "ru"
                            await TelegramNotifierService.send_message(
                                bot_token,
                                chat_id,
                                i18n_t("telegramHelp", lang),
                            )
                        continue

                    if not user.telegram_chat_id or chat_id != user.telegram_chat_id:
                        continue

                    if text.startswith("/") or text == "?":
                        command = text.split()[0]
                        await cmd_service.handle_command(user, command, session)
                        await session.commit()
                    else:
                        reply_to = message.get("reply_to_message")
                        if reply_to:
                            from app.services import message_task_mapper
                            reply_msg_id = reply_to.get("message_id")
                            if reply_msg_id:
                                tid = message_task_mapper.get(bot_token, chat_id, reply_msg_id)
                                if tid is not None:
                                    await cmd_service.handle_reply(user, tid, text, session)
                                    await session.commit()
                                    continue

                        await cmd_service.handle_text(user, text, session)
                        await session.commit()

            except Exception as e:
                logger.error(f"Error polling bot for user {user.id}: {e}")


def _run_polling_in_thread():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_do_poll_telegram_bots())
    except Exception as e:
        logger.error(f"Telegram polling thread error: {e}")
    finally:
        loop.close()


async def _job_poll_telegram_bots():
    global _polling_thread
    if _polling_thread is not None and _polling_thread.is_alive():
        return

    _polling_thread = threading.Thread(
        target=_run_polling_in_thread,
        daemon=True,
        name="tg-poll",
    )
    _polling_thread.start()


async def _job_send_backup_schedules():
    logger.info("Running job: send_backup_schedules")

    try:
        from app.services.backup_schedule_service import BackupScheduleService

        async with AsyncSessionLocal() as session:
            service = BackupScheduleService(session)
            sent_count = await service.process_due_backups()
            await session.commit()
            if sent_count > 0:
                logger.info(f"Sent {sent_count} scheduled backups")
    except Exception as e:
        logger.error(f"Error in send_backup_schedules: {e}")


async def _job_send_daily_digests():
    try:
        from zoneinfo import ZoneInfo

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(
                    User.digest_enabled.is_(True),
                    User.telegram_bot_token.isnot(None),
                    User.telegram_bot_token != '',
                    User.telegram_chat_id.isnot(None),
                )
            )
            users = list(result.scalars().all())

            for user in users:
                try:
                    user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
                    now_local = datetime.now(user_tz)
                    current_time = now_local.strftime("%H:%M")
                    today = now_local.date()

                    if user.digest_time != current_time:
                        continue
                    if user.digest_last_sent == today:
                        continue

                    bot_token = user.decrypted_telegram_bot_token
                    chat_id = user.telegram_chat_id
                    lang = getattr(user, "language", None) or "ru"

                    from app.services.telegram_command_service import TelegramCommandService
                    cmd_service = TelegramCommandService()

                    tasks = await cmd_service._get_tasks_for_date(
                        session, user.id, today, user_tz
                    )

                    overdue_count = 0
                    today_tasks_lines = []
                    for task in tasks:
                        if task.due_date:
                            due_local = task.due_date
                            if due_local.tzinfo is None:
                                due_local = due_local.replace(tzinfo=user_tz)
                            else:
                                due_local = due_local.astimezone(user_tz)
                            if due_local.date() < today and not task.is_completed:
                                overdue_count += 1
                                continue
                        today_tasks_lines.append(
                            TelegramCommandService._format_task_line(task, user_tz)
                        )

                    inbox_tasks = await cmd_service._get_inbox_tasks(session, user.id)
                    inbox_count = len(inbox_tasks)

                    from app.services.telegram_notifier import TelegramNotifierService
                    await TelegramNotifierService.send_daily_digest(
                        bot_token, chat_id,
                        "", today_tasks_lines,
                        overdue_count, inbox_count, lang,
                    )

                    user.digest_last_sent = today
                    await session.commit()

                except Exception as e:
                    logger.error(f"Digest error for user {user.id}: {e}")

    except Exception as e:
        logger.error(f"Error in _job_send_daily_digests: {e}")
