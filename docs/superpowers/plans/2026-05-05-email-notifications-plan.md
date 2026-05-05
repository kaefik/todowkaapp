# Email-оповещения — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить email-оповещения с подтверждением через код

**Architecture:** Добавить SMTP-сервис, новые поля в User, API для верификации email, scheduler для отправки email-оповещений

**Tech Stack:** Python FastAPI, SQLAlchemy, aiosmtplib, frontend React

---

## Task 1: Миграция БД — добавить поля для email-оповещений

**Files:**
- Create: `backend/alembic/versions/XXXX_add_email_notification_fields.py`

- [ ] **Step 1: Создать миграцию**

```python
"""add_email_notification_fields

Revision ID: add_email_notification_fields
Revises: 
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_email_notification_fields'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('users', sa.Column('email_notifications_enabled', sa.Boolean(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('notification_email', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('email_verification_code', sa.String(6), nullable=True))
    op.add_column('users', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'email_verified_at')
    op.drop_column('users', 'email_verification_code')
    op.drop_column('users', 'notification_email')
    op.drop_column('users', 'email_notifications_enabled')
```

- [ ] **Step 2: Запустить миграцию**

Run: `cd backend && alembic upgrade head`
Expected: Миграция применена

---

## Task 2: Обновить модель User

**Files:**
- Modify: `backend/app/models/user.py:28-35`

- [ ] **Step 1: Добавить поля в модель User**

```python
email_notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text('0'), nullable=False)
notification_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
email_verification_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

---

## Task 3: Обновить Pydantic схемы

**Files:**
- Modify: `backend/app/schemas/user.py:25-53` и `56-67`

- [ ] **Step 1: Добавить поля в UserResponse**

```python
email_notifications_enabled: bool = False
notification_email: str | None = None
email_verified_at: datetime | None = None
```

- [ ] **Step 2: Добавить поле в UserUpdate**

```python
email_notifications_enabled: bool | None = None
```

---

## Task 4: Создать Email-сервис

**Files:**
- Create: `backend/app/services/email_service.py`

- [ ] **Step 1: Написать EmailService**

```python
import logging
import random
import string
from datetime import datetime
from typing import TYPE_CHECKING

import aiosmtplib
from email.message import EmailMessage

if TYPE_CHECKING:
    from app.models.task import Task

logger = logging.getLogger(__name__)

VERIFICATION_CODE_EXPIRE_MINUTES = 15


def generate_code() -> str:
    return ''.join(random.choices(string.digits, k=6))


class EmailService:
    def __init__(self, host: str, port: int, username: str, password: str, from_addr: str):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_addr = from_addr

    async def _send(self, to: str, subject: str, body: str) -> bool:
        msg = EmailMessage()
        msg["From"] = self.from_addr
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        try:
            await aiosmtplib.send(
                msg,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                use_tls=True,
            )
            return True
        except Exception as e:
            logger.error(f"Email send failed to {to}: {e}")
            return False

    async def send_verification_email(self, email: str, code: str) -> bool:
        subject = "Подтверждение email в Todowka"
        body = f"""
Подтверждение email для Todowka.

Ваш код подтверждения: {code}

Код действителен в течение 15 минут.

Если это письмо пришло к вам по ошибке, просто игнорируйте его.
"""
        return await self._send(email, subject, body.replace('\n', '\r\n'))

    async def send_deadline_reminder(
        self, email: str, task_title: str, deadline: datetime, user_name: str, frontend_url: str
    ) -> bool:
        subject = f"Напоминание: {task_title}"
        deadline_str = deadline.strftime('%d.%m.%Y %H:%M')
        body = f"""
Привет, {user_name}!

Напоминание о задаче:

Задача: {task_title}
Дедлайн: {deadline_str}

Открой Todowka: {frontend_url}/tasks
"""
        return await self._send(email, subject, body.replace('\n', '\r\n'))

    async def send_review_reminder(self, email: str, user_name: str, frontend_url: str) -> bool:
        subject = "Время для еженедельного review"
        body = f"""
Привет, {user_name}!

Пришло время для еженедельного review.

Открой Todowka: {frontend_url}/review
"""
        return await self._send(email, subject, body.replace('\n', '\r\n'))


def get_email_service() -> EmailService | None:
    from app.config import settings

    if not all([settings.smtp_host, settings.smtp_port, settings.smtp_user, settings.smtp_password]):
        return None

    return EmailService(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        from_addr=settings.smtp_from or settings.smtp_user,
    )
```

---

## Task 5: Добавить SMTP-конфигурацию

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`
- Modify: `docker/.env.example`

- [ ] **Step 1: Добавить настройки в config.py**

```python
smtp_host: str | None = Field(default=None, validation_alias=AliasPath('smtp_host'))
smtp_port: int | None = Field(default=587, validation_alias=AliasPath('smtp_port'))
smtp_user: str | None = Field(default=None, validation_alias=AliasPath('smtp_user'))
smtp_password: str | None = Field(default=None, validation_alias=AliasPath('smtp_password'))
smtp_from: str | None = Field(default=None, validation_alias=AliasPath('smtp_from'))
```

- [ ] **Step 2: Добавить в .env.example**

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=Todowka <your-email@example.com>
```

- [ ] **Step 3: Добавить в pyproject.toml зависимость aiosmtplib**

```toml
aiosmtplib = ">=3.0.0"
email-validator = ">=2.0.0"
```

---

## Task 6: API для верификации email

**Files:**
- Modify: `backend/app/api/users.py`

- [ ] **Step 1: Добавить схемы и эндпоинты**

```python
class VerifyEmailRequest(BaseModel):
    email: EmailStr


class VerifyEmailResponse(BaseModel):
    message: str


class ConfirmEmailRequest(BaseModel):
    code: str


class ConfirmEmailResponse(BaseModel):
    message: str
    notification_email: str


@users_router.post("/verify-email", response_model=VerifyEmailResponse)
@limiter.limit(write_limit)
async def verify_email(
    request: Request,
    data: VerifyEmailRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerifyEmailResponse:
    email = data.email.lower().strip()

    result = await db.execute(
        select(User).where(
            User.email == email,
            User.id != current_user.id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already used by another user",
        )

    code = ''.join(random.choices(string.digits, k=6))

    from app.services.email_service import get_email_service
    email_service = get_email_service()
    if not email_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service not configured",
        )

    await email_service.send_verification_email(email, code)

    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(
            email_verification_code=code,
            notification_email=email,
        )
    )
    await db.commit()

    return VerifyEmailResponse(message="Код отправлен")


@users_router.post("/confirm-email", response_model=ConfirmEmailResponse)
@limiter.limit(write_limit)
async def confirm_email(
    request: Request,
    data: ConfirmEmailRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConfirmEmailResponse:
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = result.scalar_one()

    if not user.email_verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code requested",
        )

    if user.email_verification_code != data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(
            email_verification_code=None,
            email_verified_at=datetime.now(),
        )
    )
    await db.commit()
    await db.refresh(user)

    return ConfirmEmailResponse(
        message="Email подтверждён",
        notification_email=user.notification_email,
    )
```

- [ ] **Step 2: Добавить импорты в начало файла**

```python
import random
import string
from datetime import datetime
from pydantic import EmailStr
```

---

## Task 7: Обновить scheduler для email-оповещений

**Files:**
- Modify: `backend/app/scheduler.py`

- [ ] **Step 1: Добавить отправку email в _job_send_reminders**

В функции `_job_send_reminders`, после отправки Telegram:
```python
if user.email_notifications_enabled and user.notification_email:
    email_service = get_email_service()
    if email_service:
        await email_service.send_deadline_reminder(
            user.notification_email,
            task.title,
            task.due_date,
            user.username,
            settings.frontend_url,
        )
```

- [ ] **Step 2: Добавить отправку email в _job_send_deadline_notifications**

Аналогично, после Telegram.

- [ ] **Step 3: Добавить отправку email в _job_send_review_reminders**

```python
if user.review_notifications_enabled and user.notification_email:
    email_service = get_email_service()
    if email_service:
        await email_service.send_review_reminder(
            user.notification_email,
            user.username,
            settings.frontend_url,
        )
```

---

## Task 8: Frontend — обновить API и типы

**Files:**
- Modify: `frontend/src/api/users.ts`

- [ ] **Step 1: Добавить поля в User**

```typescript
email_notifications_enabled: boolean
notification_email: string | null
email_verified_at: string | null
```

- [ ] **Step 2: Добавить методы API**

```typescript
verifyEmail: async (email: string): Promise<void> => {
  await httpClient.post('/users/verify-email', { email })
},
confirmEmail: async (code: string): Promise<{ notification_email: string }> => {
  const response = await httpClient.post<{ message: string; notification_email: string }>('/users/confirm-email', { code })
  return { notification_email: response.notification_email }
},
```

- [ ] **Step 3: Обновить тип User в stores/authStore.ts**

```typescript
email_notifications_enabled: boolean
notification_email: string | null
email_verified_at: string | null
```

---

## Task 9: Frontend — UI в настройках

**Files:**
- Modify: `frontend/src/routes/settings-page.tsx`

- [ ] **Step 1: Добавить секцию Email-оповещений**

Добавить компонент, который:
- Если email_notifications_enabled = false и email_verified_at = null:
  - Показывает поле ввода email
  - Кнопка "Отправить код"
  - При вводе кода → вызов confirmEmail
- Если email_verified_at != null:
  - Показывает email с иконкой верификации
  - Переключатель "Email-оповещения"
- Кнопка "Изменить email" → сброс и повтор верификации

---

## Task 10: Запустить и проверить

- [ ] **Step 1: Запустить backend**

Run: `cd backend && ./run.sh`

- [ ] **Step 2: Запустить frontend**

Run: `cd frontend && ./run.sh`

- [ ] **Step 3: Протестировать верификацию email**

1. Зайти в настройки
2. Ввести email → нажать "Отправить код"
3. Проверить почту
4. Ввести код → подтвердить

- [ ] **Step 4: Протестировать включение оповещений**

1. Включить переключатель "Email-оповещения"
2. Создать задачу с дедлайном
3. Дождаться напоминания на email

---

## Task 11: Линтеры и проверки

- [ ] **Step 1: Backend lint**

Run: `cd backend && ruff check .`

- [ ] **Step 2: Frontend lint**

Run: `cd frontend && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add email notifications with verification code"
```