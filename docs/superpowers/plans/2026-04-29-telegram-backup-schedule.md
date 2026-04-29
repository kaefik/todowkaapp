# Telegram Backup Schedule — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scheduled automatic DB backup sending via Telegram bot as JSON file attachment.

**Architecture:** New `BackupSchedule` model (one-to-one with User) stores backup time/period preferences. A new APScheduler job runs every minute, checks which users need a backup, generates JSON via existing `ExportImportService.export_data()`, sends via new `TelegramNotifierService.send_document()`. Frontend adds a "Backup" tab in Settings.

**Tech Stack:** SQLAlchemy 2.0 (async), FastAPI, Pydantic v2, APScheduler, React 18 + TypeScript, Tailwind CSS, react-i18next

---

### Task 1: Backend — BackupSchedule model + migration

**Files:**
- Create: `backend/app/models/backup_schedule.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create BackupSchedule model**

```python
# backend/app/models/backup_schedule.py
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base as Base


class BackupSchedule(Base):
    __tablename__ = 'backup_schedules'
    __table_args__ = (
        UniqueConstraint('user_id', name='uq_backup_schedules_user_id'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default='0', nullable=False)
    time: Mapped[str] = mapped_column(String(5), nullable=False, default='03:00')
    period: Mapped[str] = mapped_column(String(10), nullable=False, default='daily')
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship('User', backref='backup_schedule')

    def __repr__(self) -> str:
        return f'<BackupSchedule(id={self.id}, user_id={self.user_id}, enabled={self.enabled})>'
```

- [ ] **Step 2: Register model in __init__.py**

Add to `backend/app/models/__init__.py`:

```python
from app.models.backup_schedule import BackupSchedule
```

Add `'BackupSchedule'` to `__all__` list.

- [ ] **Step 3: Generate Alembic migration**

Run:
```bash
cd backend && alembic revision --autogenerate -m "add_backup_schedules_table"
```

- [ ] **Step 4: Apply migration**

Run:
```bash
cd backend && alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/backup_schedule.py backend/app/models/__init__.py backend/alembic/versions/
git commit -m "feat: add BackupSchedule model and migration"
```

---

### Task 2: Backend — Pydantic schemas for BackupSchedule

**Files:**
- Create: `backend/app/schemas/backup_schedule.py`

- [ ] **Step 1: Create schemas**

```python
# backend/app/schemas/backup_schedule.py
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.base import BaseResponseSchema


class BackupScheduleCreate(BaseModel):
    enabled: bool = True
    time: str = Field(pattern=r'^\d{2}:\d{2}$')
    period: Literal['daily', 'weekly', 'monthly'] = 'daily'
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    day_of_month: int | None = Field(default=None, ge=1, le=31)

    @field_validator('day_of_week')
    @classmethod
    def validate_day_of_week(cls, v: int | None, info) -> int | None:
        period = info.data.get('period', 'daily')
        if period == 'weekly' and v is None:
            v = 1
        if period != 'weekly' and v is not None:
            v = None
        return v

    @field_validator('day_of_month')
    @classmethod
    def validate_day_of_month(cls, v: int | None, info) -> int | None:
        period = info.data.get('period', 'daily')
        if period == 'monthly' and v is None:
            v = 1
        if period != 'monthly' and v is not None:
            v = None
        return v


class BackupScheduleUpdate(BaseModel):
    enabled: bool | None = None
    time: str | None = Field(default=None, pattern=r'^\d{2}:\d{2}$')
    period: Literal['daily', 'weekly', 'monthly'] | None = None
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    day_of_month: int | None = Field(default=None, ge=1, le=31)


class BackupScheduleResponse(BaseResponseSchema):
    id: str
    user_id: str
    enabled: bool
    time: str
    period: str
    day_of_week: int | None
    day_of_month: int | None
    last_sent_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/backup_schedule.py
git commit -m "feat: add BackupSchedule pydantic schemas"
```

---

### Task 3: Backend — TelegramNotifierService.send_document

**Files:**
- Modify: `backend/app/services/telegram_notifier.py`

- [ ] **Step 1: Add send_document static method**

Add after the `send_message` method in `TelegramNotifierService` class (after line 73):

```python
    @staticmethod
    async def send_document(
        bot_token: str, chat_id: str, filename: str, json_bytes: bytes, caption: str = ""
    ) -> bool:
        url = TELEGRAM_API_BASE.format(token=bot_token, method="sendDocument")
        data = {
            "chat_id": chat_id,
            "caption": caption,
        }
        files = {
            "document": (filename, json_bytes, "application/json"),
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, data=data, files=files)
                resp_data = resp.json()
                if resp.status_code == 403:
                    logger.warning(f"Telegram bot blocked by user chat_id={chat_id}")
                    return False
                if not resp_data.get("ok"):
                    logger.warning(f"Telegram sendDocument failed: {resp_data}")
                    return False
                return True
        except httpx.HTTPError as e:
            logger.warning(f"Telegram send_document error: {e}")
            return False
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/telegram_notifier.py
git commit -m "feat: add send_document method to TelegramNotifierService"
```

---

### Task 4: Backend — BackupSchedule service

**Files:**
- Create: `backend/app/services/backup_schedule_service.py`

- [ ] **Step 1: Create service**

```python
# backend/app/services/backup_schedule_service.py
import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.backup_schedule import BackupSchedule
from app.models.user import User
from app.services.export_import_service import ExportImportService
from app.services.telegram_notifier import TelegramNotifierService

logger = logging.getLogger(__name__)

MAX_BACKUP_SIZE = 50 * 1024 * 1024


class BackupScheduleService:
    def __init__(self, db: Annotated[AsyncSession, "db"]):
        self.db = db

    async def get_schedule(self, user_id: str) -> BackupSchedule | None:
        result = await self.db.execute(
            select(BackupSchedule).where(BackupSchedule.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_schedule(self, user_id: str, data: dict) -> BackupSchedule:
        schedule = BackupSchedule(user_id=user_id, **data)
        self.db.add(schedule)
        await self.db.flush()
        return schedule

    async def update_schedule(self, schedule: BackupSchedule, data: dict) -> BackupSchedule:
        for key, value in data.items():
            if value is not None:
                setattr(schedule, key, value)
        if data.get("period") == "weekly" and schedule.day_of_week is None:
            schedule.day_of_week = 1
        if data.get("period") == "monthly" and schedule.day_of_month is None:
            schedule.day_of_month = 1
        if data.get("period") == "daily":
            schedule.day_of_week = None
            schedule.day_of_month = None
        await self.db.flush()
        return schedule

    async def delete_schedule(self, schedule: BackupSchedule) -> None:
        await self.db.delete(schedule)
        await self.db.flush()

    async def send_backup_now(self, user: User) -> bool:
        if not user.telegram_bot_token or not user.telegram_chat_id:
            return False
        return await self._generate_and_send(user)

    async def _generate_and_send(self, user: User) -> bool:
        try:
            export_service = ExportImportService(self.db)
            data = await export_service.export_data(user_id=user.id)
            content = json.dumps(data, ensure_ascii=False, indent=2)
            json_bytes = content.encode("utf-8")

            if len(json_bytes) > MAX_BACKUP_SIZE:
                await TelegramNotifierService.send_message(
                    user.telegram_bot_token,
                    user.telegram_chat_id,
                    "\u26a0\ufe0f Резервная копия слишком большая (>{MAX_BACKUP_SIZE // (1024*1024)}MB). Обратитесь в поддержку.",
                )
                return False

            now = datetime.now(UTC)
            filename = f"todowka_backup_{now.strftime('%Y-%m-%d_%H-%M')}.json"
            caption = f"\U0001f4be Todowka backup {now.strftime('%d.%m.%Y %H:%M')} UTC"

            success = await TelegramNotifierService.send_document(
                user.telegram_bot_token, user.telegram_chat_id, filename, json_bytes, caption
            )
            return success
        except Exception as e:
            logger.error(f"Backup generation/sending failed for user {user.id}: {e}")
            return False

    async def process_due_backups(self) -> int:
        result = await self.db.execute(
            select(BackupSchedule)
            .where(BackupSchedule.enabled.is_(True))
        )
        schedules = list(result.scalars().all())

        sent_count = 0
        now_utc = datetime.now(UTC)

        for schedule in schedules:
            user_result = await self.db.execute(
                select(User).where(User.id == schedule.user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                continue
            if not user.telegram_bot_token or not user.telegram_chat_id:
                continue

            user_tz = ZoneInfo(user.timezone or "Europe/Moscow")
            now_local = now_utc.astimezone(user_tz)

            if not self._is_due(schedule, now_local):
                continue

            success = await self._generate_and_send(user)
            if success:
                schedule.last_sent_at = now_utc
                sent_count += 1
                await self.db.flush()

        return sent_count

    def _is_due(self, schedule: BackupSchedule, now_local: datetime) -> bool:
        hours, minutes = map(int, schedule.time.split(":"))
        if now_local.hour != hours or now_local.minute != minutes:
            return False

        if schedule.period == "weekly":
            if now_local.isoweekday() != (schedule.day_of_week or 1):
                return False
        elif schedule.period == "monthly":
            if now_local.day != (schedule.day_of_month or 1):
                return False

        if schedule.last_sent_at:
            user_tz = ZoneInfo("UTC")
            last_sent_local = schedule.last_sent_at.astimezone(user_tz)
            if schedule.period == "daily":
                if (now_local.date() - last_sent_local.date()).days < 1:
                    return False
            elif schedule.period == "weekly":
                days_since = (now_local.date() - last_sent_local.date()).days
                if days_since < 7:
                    return False
            elif schedule.period == "monthly":
                if now_local.month == last_sent_local.month and now_local.year == last_sent_local.year:
                    return False

        return True
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/backup_schedule_service.py
git commit -m "feat: add BackupScheduleService with send and schedule logic"
```

---

### Task 5: Backend — API endpoints

**Files:**
- Create: `backend/app/api/backup_schedules.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create API router**

```python
# backend/app/api/backup_schedules.py
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.backup_schedule import (
    BackupScheduleCreate,
    BackupScheduleResponse,
    BackupScheduleUpdate,
)
from app.services.backup_schedule_service import BackupScheduleService

backup_schedules_router = APIRouter(prefix="/backup-schedule", tags=["backup-schedule"])


@backup_schedules_router.get("", response_model=BackupScheduleResponse)
async def get_backup_schedule(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BackupScheduleService(db)
    schedule = await service.get_schedule(current_user.id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup schedule not found")
    return schedule


@backup_schedules_router.post("", response_model=BackupScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_backup_schedule(
    data: BackupScheduleCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not current_user.telegram_bot_token or not current_user.telegram_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram bot must be connected first",
        )
    service = BackupScheduleService(db)
    existing = await service.get_schedule(current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backup schedule already exists. Use PUT to update.",
        )
    schedule = await service.create_schedule(current_user.id, data.model_dump())
    await db.commit()
    return schedule


@backup_schedules_router.put("", response_model=BackupScheduleResponse)
async def update_backup_schedule(
    data: BackupScheduleUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BackupScheduleService(db)
    schedule = await service.get_schedule(current_user.id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup schedule not found")
    update_data = data.model_dump(exclude_none=True)
    schedule = await service.update_schedule(schedule, update_data)
    await db.commit()
    return schedule


@backup_schedules_router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup_schedule(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = BackupScheduleService(db)
    schedule = await service.get_schedule(current_user.id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup schedule not found")
    await service.delete_schedule(schedule)
    await db.commit()


@backup_schedules_router.post("/send-now")
async def send_backup_now(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not current_user.telegram_bot_token or not current_user.telegram_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram bot must be connected first",
        )
    service = BackupScheduleService(db)
    success = await service.send_backup_now(current_user)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send backup",
        )
    await db.commit()
    return {"status": "sent", "sent_at": datetime.now(UTC).isoformat()}
```

- [ ] **Step 2: Register router in main.py**

In `backend/app/main.py`:

Add import at top (after line 24):
```python
from app.api.backup_schedules import backup_schedules_router
```

Add router registration (after line 93, before `app.include_router(api_router)`):
```python
    api_router.include_router(backup_schedules_router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/backup_schedules.py backend/app/main.py
git commit -m "feat: add backup schedule API endpoints"
```

---

### Task 6: Backend — Scheduler job

**Files:**
- Modify: `backend/app/scheduler.py`

- [ ] **Step 1: Add backup schedule job**

In `backend/app/scheduler.py`:

Add import at top:
```python
from app.models.backup_schedule import BackupSchedule
```

Add job registration in `startup()` method, after the `poll_telegram_bots` job (after line 102, before `self.scheduler.start()`):

```python
            self.scheduler.add_job(
                _job_send_backup_schedules,
                'interval',
                minutes=1,
                id='send_backup_schedules',
                replace_existing=True,
                max_instances=1,
            )
```

Add the job function at module level (after `_job_poll_telegram_bots` function, at end of file):

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/scheduler.py
git commit -m "feat: add scheduled backup job to APScheduler"
```

---

### Task 7: Frontend — API client + hook

**Files:**
- Create: `frontend/src/api/backupSchedules.ts`
- Create: `frontend/src/hooks/useBackupSchedule.ts`

- [ ] **Step 1: Create API client**

```typescript
// frontend/src/api/backupSchedules.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export interface BackupScheduleData {
  id: string
  user_id: string
  enabled: boolean
  time: string
  period: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  last_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface BackupScheduleCreate {
  enabled?: boolean
  time: string
  period: 'daily' | 'weekly' | 'monthly'
  day_of_week?: number | null
  day_of_month?: number | null
}

export interface BackupScheduleUpdate {
  enabled?: boolean | null
  time?: string | null
  period?: 'daily' | 'weekly' | 'monthly' | null
  day_of_week?: number | null
  day_of_month?: number | null
}

async function getHeaders(): Promise<Record<string, string>> {
  const { useAuthStore } = await import('../stores/authStore')
  const authStore = useAuthStore.getState()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authStore.isAuthenticated) {
    headers['X-Requested-With'] = 'XMLHttpRequest'
  }
  return headers
}

export const backupScheduleApi = {
  async get(): Promise<BackupScheduleData | null> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/backup-schedule`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error('Failed to get backup schedule')
    return response.json()
  },

  async create(data: BackupScheduleCreate): Promise<BackupScheduleData> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/backup-schedule`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create' }))
      throw new Error(error.detail || 'Failed to create backup schedule')
    }
    return response.json()
  },

  async update(data: BackupScheduleUpdate): Promise<BackupScheduleData> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/backup-schedule`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update backup schedule')
    return response.json()
  },

  async delete(): Promise<void> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/backup-schedule`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to delete backup schedule')
  },

  async sendNow(): Promise<{ status: string; sent_at: string }> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/backup-schedule/send-now`, {
      method: 'POST',
      headers,
      credentials: 'include',
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to send' }))
      throw new Error(error.detail || 'Failed to send backup')
    }
    return response.json()
  },
}
```

- [ ] **Step 2: Create hook**

```typescript
// frontend/src/hooks/useBackupSchedule.ts
import { useState, useEffect, useCallback } from 'react'
import { backupScheduleApi, type BackupScheduleData } from '../api/backupSchedules'

export function useBackupSchedule() {
  const [schedule, setSchedule] = useState<BackupScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await backupScheduleApi.get()
      setSchedule(data)
    } catch {
      setSchedule(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (data: {
    enabled?: boolean
    time: string
    period: 'daily' | 'weekly' | 'monthly'
    day_of_week?: number | null
    day_of_month?: number | null
  }) => {
    setSaving(true)
    try {
      if (schedule) {
        const updated = await backupScheduleApi.update(data)
        setSchedule(updated)
      } else {
        const created = await backupScheduleApi.create(data)
        setSchedule(created)
      }
    } finally {
      setSaving(false)
    }
  }, [schedule])

  const remove = useCallback(async () => {
    setSaving(true)
    try {
      await backupScheduleApi.delete()
      setSchedule(null)
    } finally {
      setSaving(false)
    }
  }, [])

  const sendNow = useCallback(async () => {
    setSending(true)
    try {
      await backupScheduleApi.sendNow()
    } finally {
      setSending(false)
    }
  }, [])

  return { schedule, loading, saving, sending, save, remove, sendNow, reload: load }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/backupSchedules.ts frontend/src/hooks/useBackupSchedule.ts
git commit -m "feat: add backup schedule API client and hook"
```

---

### Task 8: Frontend — i18n keys

**Files:**
- Modify: `frontend/src/i18n/locales/ru/settings.json`
- Modify: `frontend/src/i18n/locales/en/settings.json`

- [ ] **Step 1: Add Russian keys**

Add to end of `frontend/src/i18n/locales/ru/settings.json` (before closing `}`), after `"confirmImport"`:

```json
,
  "tabBackup": "Резервные копии",
  "backupTitle": "Автоматические резервные копии",
  "backupDescription": "Настройте автоматическую отправку резервной копии ваших данных в Telegram.",
  "backupTelegramRequired": "Сначала подключите Telegram-бот на вкладке «Общие»",
  "backupEnable": "Включить автоматические бэкапы",
  "backupTime": "Время отправки",
  "backupPeriod": "Периодичность",
  "backupPeriodDaily": "Ежедневно",
  "backupPeriodWeekly": "Еженедельно",
  "backupPeriodMonthly": "Ежемесячно",
  "backupDayOfWeek": "День недели",
  "backupDayOfMonth": "Число месяца",
  "backupDayOfWeekMon": "Понедельник",
  "backupDayOfWeekTue": "Вторник",
  "backupDayOfWeekWed": "Среда",
  "backupDayOfWeekThu": "Четверг",
  "backupDayOfWeekFri": "Пятница",
  "backupDayOfWeekSat": "Суббота",
  "backupDayOfWeekSun": "Воскресенье",
  "backupSendNow": "Отправить сейчас",
  "backupSending": "Отправка...",
  "backupSent": "Резервная копия отправлена в Telegram",
  "backupError": "Ошибка отправки резервной копии",
  "backupSaved": "Настройки бэкапа сохранены",
  "backupSaveError": "Ошибка сохранения настроек бэкапа",
  "backupLastSent": "Последняя отправка:",
  "backupNeverSent": "Ещё не отправлялось",
  "backupNextSend": "Следующая отправка будет в указанное время"
```

- [ ] **Step 2: Add English keys**

Add to end of `frontend/src/i18n/locales/en/settings.json` (before closing `}`), after `"confirmImport"`:

```json
,
  "tabBackup": "Backups",
  "backupTitle": "Automatic Backups",
  "backupDescription": "Set up automatic backup delivery of your data to Telegram.",
  "backupTelegramRequired": "Connect a Telegram bot first in the «General» tab",
  "backupEnable": "Enable automatic backups",
  "backupTime": "Send time",
  "backupPeriod": "Frequency",
  "backupPeriodDaily": "Daily",
  "backupPeriodWeekly": "Weekly",
  "backupPeriodMonthly": "Monthly",
  "backupDayOfWeek": "Day of week",
  "backupDayOfMonth": "Day of month",
  "backupDayOfWeekMon": "Monday",
  "backupDayOfWeekTue": "Tuesday",
  "backupDayOfWeekWed": "Wednesday",
  "backupDayOfWeekThu": "Thursday",
  "backupDayOfWeekFri": "Friday",
  "backupDayOfWeekSat": "Saturday",
  "backupDayOfWeekSun": "Sunday",
  "backupSendNow": "Send now",
  "backupSending": "Sending...",
  "backupSent": "Backup sent to Telegram",
  "backupError": "Failed to send backup",
  "backupSaved": "Backup settings saved",
  "backupSaveError": "Failed to save backup settings",
  "backupLastSent": "Last sent:",
  "backupNeverSent": "Not sent yet",
  "backupNextSend": "Next backup will be sent at the specified time"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/locales/ru/settings.json frontend/src/i18n/locales/en/settings.json
git commit -m "feat: add backup schedule i18n keys (ru/en)"
```

---

### Task 9: Frontend — BackupScheduleSettings component

**Files:**
- Create: `frontend/src/components/BackupScheduleSettings.tsx`
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Create BackupScheduleSettings component**

```tsx
// frontend/src/components/BackupScheduleSettings.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBackupSchedule } from '../hooks/useBackupSchedule'
import { useToastStore } from '../stores/toastStore'
import type { User } from '../api/users'

interface Props {
  user: User
}

const DAYS_OF_WEEK = [
  { value: 1, key: 'backupDayOfWeekMon' },
  { value: 2, key: 'backupDayOfWeekTue' },
  { value: 3, key: 'backupDayOfWeekWed' },
  { value: 4, key: 'backupDayOfWeekThu' },
  { value: 5, key: 'backupDayOfWeekFri' },
  { value: 6, key: 'backupDayOfWeekSat' },
  { value: 7, key: 'backupDayOfWeekSun' },
] as const

export function BackupScheduleSettings({ user }: Props) {
  const { t } = useTranslation('settings')
  const { schedule, loading, saving, sending, save, sendNow, reload } = useBackupSchedule()
  const addToast = useToastStore((s) => s.addToast)

  const [enabled, setEnabled] = useState(schedule?.enabled ?? true)
  const [time, setTime] = useState(schedule?.time ?? '03:00')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(schedule?.period ?? 'daily')
  const [dayOfWeek, setDayOfWeek] = useState(schedule?.day_of_week ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState(schedule?.day_of_month ?? 1)

  const telegramConnected = !!(user.telegram_bot_token && user.telegram_chat_id)

  const handleSave = async () => {
    try {
      await save({
        enabled,
        time,
        period,
        day_of_week: period === 'weekly' ? dayOfWeek : null,
        day_of_month: period === 'monthly' ? dayOfMonth : null,
      })
      addToast({ title: t('backupSaved'), body: '', type: 'success' })
      reload()
    } catch {
      addToast({ title: t('backupSaveError'), body: '', type: 'error' })
    }
  }

  const handleSendNow = async () => {
    try {
      await sendNow()
      addToast({ title: t('backupSent'), body: '', type: 'success' })
    } catch {
      addToast({ title: t('backupError'), body: '', type: 'error' })
    }
  }

  if (!telegramConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('backupTitle')}</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <p className="text-yellow-700 dark:text-yellow-300">{t('backupTelegramRequired')}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('backupTitle')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('backupDescription')}</p>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('backupEnable')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('backupTime')}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('backupPeriod')}
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="daily">{t('backupPeriodDaily')}</option>
            <option value="weekly">{t('backupPeriodWeekly')}</option>
            <option value="monthly">{t('backupPeriodMonthly')}</option>
          </select>
        </div>

        {period === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('backupDayOfWeek')}
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>{t(d.key)}</option>
              ))}
            </select>
          </div>
        )}

        {period === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('backupDayOfMonth')}
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}

        {schedule?.last_sent_at && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('backupLastSent')} {new Date(schedule.last_sent_at).toLocaleString()}
          </p>
        )}

        {!schedule?.last_sent_at && schedule && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('backupNeverSent')}</p>
        )}

        {schedule && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('backupNextSend')}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? '...' : (schedule ? t('saveChanges', { ns: 'settings' }) : t('saveChanges', { ns: 'settings' }))}
          </button>

          {telegramConnected && (
            <button
              onClick={handleSendNow}
              disabled={sending}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
            >
              {sending ? t('backupSending') : t('backupSendNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add backup tab to Settings.tsx**

In `frontend/src/routes/Settings.tsx`:

1. Update `Tab` type (line 15):
```typescript
type Tab = 'general' | 'appearance' | 'profile' | 'security' | 'verbs' | 'users' | 'backup'
```

2. Add import at top:
```typescript
import { BackupScheduleSettings } from '../components/BackupScheduleSettings'
```

3. Add tab to tabs array (line 194, after users entry):
```typescript
    { key: 'backup', label: t('tabBackup'), adminOnly: false },
```

4. Add tab content rendering (before closing `</div>` of SettingsContent, after the users tab rendering):
```tsx
      {activeTab === 'backup' && <BackupScheduleSettings user={user!} />}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/BackupScheduleSettings.tsx frontend/src/routes/Settings.tsx
git commit -m "feat: add backup schedule settings UI component"
```

---

### Task 10: Backend — Tests

**Files:**
- Create: `backend/tests/test_backup_schedules.py`

- [ ] **Step 1: Check existing test patterns**

Run:
```bash
ls backend/tests/
```

Read one test file (e.g. `backend/tests/test_contexts.py` first 50 lines) to match the testing pattern.

- [ ] **Step 2: Write tests for backup schedule API**

Create `backend/tests/test_backup_schedules.py` with tests covering:
- GET /api/backup-schedule returns 404 when no schedule exists
- POST /api/backup-schedule creates schedule (requires telegram connected)
- POST /api/backup-schedule returns 400 when telegram not connected
- POST /api/backup-schedule returns 409 when already exists
- PUT /api/backup-schedule updates schedule
- DELETE /api/backup-schedule deletes schedule
- POST /api/backup-schedule/send-now sends backup (requires telegram)
- BackupScheduleService._is_due logic (daily, weekly, monthly, already sent)

- [ ] **Step 3: Run tests**

Run:
```bash
cd backend && pytest tests/test_backup_schedules.py -v
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_backup_schedules.py
git commit -m "test: add backup schedule API tests"
```

---

### Task 11: Update features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add feature documentation**

Add under appropriate section in `docs/features.md`:

```markdown
- Автоматические резервные копии в Telegram ✅ (Реализовано 29.04.2026)
  - Настраиваемое расписание отправки JSON-бэкапа БД в Telegram-бот
  - Периодичность: ежедневно, еженедельно (выбор дня недели), ежемесячно (выбор числа)
  - Точное время отправки в часовом поясе пользователя
  - Кнопка «Отправить сейчас» для ручной отправки вне расписания
  - Доступно только при подключённом Telegram-боте (токен + chat_id)
  - Файл отправляется как документ через Telegram API (sendDocument)
  - Новый scheduler job: _job_send_backup_schedules (каждую 1 минуту)
  - Модель: BackupSchedule (отдельная таблица, один к одному с User)
  - API: GET/POST/PUT/DELETE /api/backup-schedule, POST /api/backup-schedule/send-now
  - Файлы: `backend/app/models/backup_schedule.py`, `backend/app/schemas/backup_schedule.py`, `backend/app/services/backup_schedule_service.py`, `backend/app/api/backup_schedules.py`, `backend/app/scheduler.py`, `backend/app/services/telegram_notifier.py`, `frontend/src/components/BackupScheduleSettings.tsx`, `frontend/src/api/backupSchedules.ts`, `frontend/src/hooks/useBackupSchedule.ts`, `frontend/src/routes/Settings.tsx`
```

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "docs: update features.md with backup schedule feature"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run backend linting**

```bash
cd backend && ruff check .
```

Expected: No errors.

- [ ] **Step 2: Run backend tests**

```bash
cd backend && pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 3: Run frontend lint**

```bash
cd frontend && npm run lint
```

Expected: No errors.

- [ ] **Step 4: Run frontend typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors.
