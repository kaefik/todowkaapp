import logging
import random
import string
from datetime import datetime
from email.message import EmailMessage
from typing import TYPE_CHECKING

import aiosmtplib

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

VERIFICATION_CODE_EXPIRE_MINUTES = 15


def generate_code() -> str:
    return ''.join(random.choices(string.digits, k=6))


class EmailService:
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        from_addr: str,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_addr = from_addr
        self.use_tls = port == 465 or port == 587

    async def _send(self, to: str, subject: str, body: str) -> bool:
        msg = EmailMessage()
        msg["From"] = self.from_addr
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        try:
            if self.port == 465:
                await aiosmtplib.send(
                    msg,
                    hostname=self.host,
                    port=self.port,
                    username=self.username,
                    password=self.password,
                    use_tls=True,
                )
            else:
                await aiosmtplib.send(
                    msg,
                    hostname=self.host,
                    port=self.port,
                    username=self.username,
                    password=self.password,
                    start_tls=True,
                )
            return True
        except Exception as e:
            logger.error(f"Email send failed to {to}: {e}")
            return False

    async def send_verification_email(self, email: str, code: str) -> bool:
        subject = "Подтверждение email в Todowka"
        body = f"""Подтверждение email для Todowka.

Ваш код подтверждения: {code}

Код действителен в течение 15 минут.

Если это письмо пришло к вам по ошибке, просто игнорируйте его."""
        return await self._send(email, subject, body)

    async def send_deadline_reminder(
        self,
        email: str,
        task_title: str,
        deadline: datetime,
        user_name: str,
        frontend_url: str,
    ) -> bool:
        subject = f"Напоминание: {task_title}"
        deadline_str = deadline.strftime("%d.%m.%Y %H:%M")
        body = f"""Привет, {user_name}!

Напоминание о задаче:

Задача: {task_title}
Дедлайн: {deadline_str}

Открой Todowka: {frontend_url}/tasks"""
        return await self._send(email, subject, body)

    async def send_review_reminder(
        self, email: str, user_name: str, frontend_url: str
    ) -> bool:
        subject = "Время для еженедельного review"
        body = f"""Привет, {user_name}!

Пришло время для еженедельного review.

Открой Todowka: {frontend_url}/review"""
        return await self._send(email, subject, body)

    async def send_confirmation_success(self, email: str, user_name: str, frontend_url: str) -> bool:
        subject = "Доступ подтвержден — Todowka готова к работе"
        body = f"""Привет, {user_name}!

Отлично! Ваш email подтвержден.

Теперь вы будете получать напоминания о задачах с приближающимися дедлайнами и еженедельные напоминания о review.

Открой Todowka: {frontend_url}/tasks"""
        return await self._send(email, subject, body)


async def get_email_service_from_db(db) -> EmailService | None:
    from sqlalchemy import text

    result = await db.execute(text(
        "SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'"
    ))
    rows = result.fetchall()

    smtp_config = {}
    for row in rows:
        if row[0] == 'smtp_host':
            smtp_config['host'] = row[1]
        elif row[0] == 'smtp_port' and row[1]:
            smtp_config['port'] = int(row[1])
        elif row[0] == 'smtp_user':
            smtp_config['username'] = row[1]
        elif row[0] == 'smtp_password':
            smtp_config['password'] = row[1]
        elif row[0] == 'smtp_from':
            smtp_config['from_addr'] = row[1]

    if not smtp_config.get('host') or not smtp_config.get('username'):
        return None

    return EmailService(
        host=smtp_config['host'],
        port=smtp_config.get('port', 587),
        username=smtp_config['username'],
        password=smtp_config.get('password', ''),
        from_addr=smtp_config.get('from_addr', smtp_config['username']),
    )


def get_email_service() -> EmailService | None:
    """Legacy function that reads from config - kept for backward compatibility"""
    from app.config import settings

    if not all(
        [
            settings.smtp_host,
            settings.smtp_port,
            settings.smtp_user,
            settings.smtp_password,
        ]
    ):
        return None

    return EmailService(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        from_addr=settings.smtp_from or settings.smtp_user,
    )
