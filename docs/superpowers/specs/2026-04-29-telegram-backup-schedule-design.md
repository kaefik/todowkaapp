# Telegram Backup Schedule — Design Spec

**Date:** 2026-04-29
**Status:** Approved

## Overview

Автоматическая отправка JSON-резервной копии БД пользователя в Telegram-бот по расписанию. Пользователь выбирает точное время и периодичность (ежедневно / еженедельно / ежемесячно). Бэкап отправляется как файл-документ.

## Requirements

- Настройка расписания только в UI приложения (Settings)
- Доступно только при подключённом Telegram-боте (token + chat_id)
- Периодичность: daily, weekly, monthly
- Точное время отправки в часовом поясе пользователя
- Отправка JSON-файла через Telegram `sendDocument`
- Кнопка «Отправить сейчас» для ручного бэкапа

## Architecture

### Model: BackupSchedule

```
backup_schedules
├── id: String(36) PK UUID
├── user_id: String(36) FK→users.id UNIQUE cascade=delete-orphan
├── enabled: Boolean default=False
├── time: String(5) — HH:MM (в timezone пользователя)
├── period: String(10) — daily | weekly | monthly
├── day_of_week: Integer nullable — 1-7 (Пн-Вс), для weekly
├── day_of_month: Integer nullable — 1-31, для monthly
├── last_sent_at: DateTime(tz) nullable
├── created_at: DateTime(tz)
└── updated_at: DateTime(tz)
```

- `user_id` UNIQUE — одно расписание на пользователя
- `time` хранится как HH:MM в локальном таймзоне пользователя, scheduler конвертирует в UTC
- `day_of_week` — для weekly: какой день недели отправлять (1=Пн, 7=Вс). Default: 1 (понедельник)
- `day_of_month` — для monthly: какое число месяца отправлять. Default: 1

### Scheduler Job: _job_send_backup_schedules

Запускается каждую 1 минуту через APScheduler.

**Логика:**

1. SELECT backup_schedules WHERE enabled=True, eager load User
2. Для каждого расписания:
   a. Получить user.timezone (default Europe/Moscow)
   b. Конвертировать schedule.time (HH:MM) из user.timezone в UTC для текущего дня
   c. Проверить совпадение: текущая UTC-минута == расчётное время (с точностью до минуты)
   d. Проверить период:
      - daily: каждый день
      - weekly: текущий день недели == schedule.day_of_week
      - monthly: текущее число == schedule.day_of_month
   e. Проверить last_sent_at: если уже отправлялось в текущем периоде — пропустить
   f. Генерировать JSON через ExportImportService.export_data(user_id)
   g. Отправить как документ через TelegramNotifierService.send_document()
   h. Обновить last_sent_at = now()

### API Endpoints

```
GET    /api/backup-schedule          — получить расписание (404 если нет)
POST   /api/backup-schedule          — создать расписание
PUT    /api/backup-schedule          — обновить расписание
DELETE /api/backup-schedule          — удалить расписание
POST   /api/backup-schedule/send-now — отправить бэкап сейчас
```

### Pydantic Schemas

```python
BackupScheduleCreate:
  enabled: bool = True
  time: str  # HH:MM, validated by regex
  period: Literal["daily", "weekly", "monthly"]
  day_of_week: int | None  # 1-7, required if period=weekly
  day_of_month: int | None  # 1-31, required if period=monthly

BackupScheduleUpdate:
  enabled: bool | None
  time: str | None
  period: str | None
  day_of_week: int | None
  day_of_month: int | None

BackupScheduleResponse:
  id: str
  enabled: bool
  time: str
  period: str
  day_of_week: int | None
  day_of_month: int | None
  last_sent_at: str | None
  created_at: str
  updated_at: str
```

### TelegramNotifierService: send_document

Новый статический метод:

```python
@staticmethod
async def send_document(bot_token: str, chat_id: str, filename: str, json_bytes: bytes) -> bool:
    # POST https://api.telegram.org/bot{token}/sendDocument
    # multipart/form-data: document=(filename, json_bytes, "application/json")
    # caption: "Todowka backup YYYY-MM-DD HH:MM"
```

### Frontend: Settings UI

**Расположение:** Settings → новая вкладка «Резервное копирование»

**Предусловие:** Проверка `telegram_bot_token` и `telegram_chat_id`. Если не подключён — предупреждение «Сначала подключите Telegram-бот» со ссылкой на вкладку Telegram.

**Элементы формы:**

- Toggle: Включить автоматические бэкапы (включает/выключает)
- Input type="time": Время отправки
- Select: Периодичность — ежедневно / еженедельно / ежемесячно
- Условные поля:
  - Если weekly: Select дня недели (Пн—Вс)
  - Если monthly: Input числа месяца (1-31)
- Информационный текст: «Следующий бэкап: DD.MM.YYYY HH:MM»
- Кнопка «Отправить сейчас» — POST /api/backup-schedule/send-now

**i18n:** Ключи в namespace `settings` (ru/en): backupTab, backupTitle, backupEnable, backupTime, backupPeriod, backupDaily, backupWeekly, backupMonthly, backupDayOfWeek, backupDayOfMonth, backupNextAt, backupSendNow, backupTelegramRequired, backupSending, backupSent, backupError.

### Error Handling

- Telegram 403 (bot blocked): логировать warning, не отключать расписание
- JSON > 50MB (Telegram limit): отправить текстовое сообщение с ошибкой вместо файла
- Timezone change: scheduler пересчитывает время при каждой проверке
- DST transitions: обрабатывается через zoneinfo корректно
- Invalid schedule data: валидация на уровне Pydantic schema

## Files to Create/Modify

### New files
- `backend/app/models/backup_schedule.py`
- `backend/app/schemas/backup_schedule.py`
- `backend/app/services/backup_schedule_service.py`
- `backend/app/api/backup_schedules.py`
- `frontend/src/api/backupSchedules.ts`
- `frontend/src/hooks/useBackupSchedule.ts`
- `frontend/src/components/BackupScheduleSettings.tsx`
- `frontend/src/i18n/locales/ru/settings.json` (add keys)
- `frontend/src/i18n/locales/en/settings.json` (add keys)

### Modified files
- `backend/app/models/__init__.py` — import BackupSchedule
- `backend/app/api/router.py` — include backup_schedules router
- `backend/app/scheduler.py` — add _job_send_backup_schedules
- `backend/app/services/telegram_notifier.py` — add send_document method
- `frontend/src/routes/Settings.tsx` — add backup tab
- `frontend/src/router.tsx` or component registration if needed
- `backend/alembic/versions/` — new migration
- `docs/features.md` — document feature

## Out of Scope

- Шифрование бэкапа паролем
- Хранение истории бэкапов на сервере
- Восстановление из бэкапа через Telegram (только через UI)
- Несколько расписаний на одного пользователя
- Webhook-based Telegram bot (остаёмся на polling)
