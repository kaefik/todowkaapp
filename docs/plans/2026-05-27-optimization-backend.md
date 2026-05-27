# Backend Scheduler Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Снизить нагрузку бекенда на сервер, устранив избыточный поллинг, конкуренцию за SQLite lock и лишние логи.

**Architecture:** Оптимизация APScheduler джоб — снижение частоты поллинга Telegram, разнесение минутных джоб по времени (разные интервалы), кеширование проверки наличия пользователей для привязки, уменьшение объёма логирования.

**Tech Stack:** Python 3.12, APScheduler 3.x (AsyncIOScheduler), SQLAlchemy 2.0 async + aiosqlite, SQLite WAL, Docker healthcheck

---

## Корневые проблемы (из анализа логов)

| # | Проблема | Влияние |
|---|----------|---------|
| 1 | `_job_poll_telegram_bots` каждые 5 сек | 720 запусков/час, каждый создаёт подключение к БД + новый thread + event loop |
| 2 | 3 джобы одновременно каждую минуту | Конкуренция за SQLite write lock → `database is locked` |
| 3 | Docker healthcheck каждые 10 сек | +360 HTTP-запросов/час |
| 4 | Startup recovery bug | `Multiple rows were found when one or none was required` |
| 5 | ~3000+ строк логов/час | APScheduler + scheduler.py логируют каждый запуск на INFO |

---

### Task 1: Увеличить интервал `_job_poll_telegram_bots` с 5 до 30 секунд

**Files:**
- Modify: `backend/app/scheduler.py:124-131`

Это снизит количество запусков с 720 до 120 в час (в 6 раз). Для UX привязки Telegram — задержка 30с вместо 5с незаметна.

- [ ] **Step 1: Изменить интервал в add_job**

В `backend/app/scheduler.py:124-131` заменить `seconds=5` на `seconds=30`:

```python
            self.scheduler.add_job(
                _job_poll_telegram_bots,
                'interval',
                seconds=30,
                id='poll_telegram_bots',
                replace_existing=True,
                max_instances=1,
            )
```

- [ ] **Step 2: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_scheduler.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/app/scheduler.py
git commit -m "perf: increase telegram bot polling interval from 5s to 30s"
```

---

### Task 2: Добавить кеширование для `_job_poll_telegram_bots` — пропускать если нет пользователей для привязки

**Files:**
- Modify: `backend/app/scheduler.py:620-692`

Сейчас каждый запуск делает запрос к БД даже если нет ни одного пользователя с `telegram_bot_token IS NOT NULL AND telegram_chat_id IS NULL`. Добавим TTL-кеширование: если проверка показала «нет пользователей», пропускаем следующие вызовы на 60 секунд.

**Важно:** проверка кеша выполняется в главном event loop (в `_job_poll_telegram_bots`) ДО spawning thread, что исключает race condition.

- [ ] **Step 1: Добавить кеш-переменные рядом с `_telegram_poll_offsets`**

В `backend/app/scheduler.py` после строки 620 заменить:

```python
_telegram_poll_offsets: dict[str, int] = {}
_polling_thread: threading.Thread | None = None
_no_pending_users_until: float = 0.0
```

- [ ] **Step 2: Добавить проверку кеша в `_job_poll_telegram_bots` ДО spawning thread**

Заменить функцию `_job_poll_telegram_bots()` (строки 682-692) на:

```python
async def _job_poll_telegram_bots():
    import time as _time
    global _polling_thread

    if _time.monotonic() < _no_pending_users_until:
        return

    if _polling_thread is not None and _polling_thread.is_alive():
        return

    _polling_thread = threading.Thread(
        target=_run_polling_in_thread,
        daemon=True,
        name="tg-poll",
    )
    _polling_thread.start()
```

Проверка `_no_pending_users_until` теперь в главном event loop — нет race condition с thread.

- [ ] **Step 3: Заменить функцию `_do_poll_telegram_bots()` на версию с кешированием**

Заменить функцию `_do_poll_telegram_bots()` (строки 624-668) на:

```python
async def _do_poll_telegram_bots():
    import time as _time
    from app.services.telegram_notifier import TelegramNotifierService

    global _no_pending_users_until

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(
                User.telegram_bot_token.isnot(None),
                User.telegram_bot_token != '',
                User.telegram_chat_id.is_(None),
            )
        )
        users = list(result.scalars().all())

        if not users:
            _no_pending_users_until = _time.monotonic() + 60
            return

        _no_pending_users_until = 0.0

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

                        lang = getattr(user, 'language', None) or "ru"
                        await TelegramNotifierService.send_message(
                            user.telegram_bot_token,
                            chat_id,
                            i18n_t("telegramBotConnected", lang),
                        )
                        break

            except Exception as e:
                logger.error(f"Error polling bot for user {user.id}: {e}")
```

Логика: если нет пользователей для привязки — кешируем на 60 сек. Появился пользователь — сбрасываем кеш. При привязке (user.telegram_chat_id установлен) пользователь сам выпадет из выборки.

- [ ] **Step 4: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_scheduler.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/scheduler.py
git commit -m "perf: skip telegram polling when no pending users (60s TTL cache)"
```

---

### Task 3: Разнести минутные джобы по времени (next_run_time offset)

**Files:**
- Modify: `backend/app/scheduler.py:52-68` (send_due_reminders)
- Modify: `backend/app/scheduler.py:61-68` (send_deadline_notifications)
- Modify: `backend/app/scheduler.py:133-140` (send_backup_schedules)

Сейчас три джобы стартуют одновременно в секунду XX:34. Это создаёт пиковую нагрузку на SQLite. APScheduler 3.x **не поддерживает** параметр `jitter`, а разные интервалы (60/70/80с) **опасны** — `BackupScheduleService._is_due()` проверяет точное совпадение минуты (`hour == X AND minute == Y`), интервал 80с систематически пропускает каждую 4-ю минуту.

Решение: все три джобы остаются на `seconds=60`, но сдвигаются через параметр `next_run_time` — стартуют с offset 0, 20 и 40 секунд.

- [ ] **Step 1: Изменить send_due_reminders — интервал 60 сек, старт сразу**

В `backend/app/scheduler.py:52-59` заменить:

```python
            self.scheduler.add_job(
                self._job_send_due_reminders,
                'interval',
                seconds=60,
                id='send_due_reminders',
                replace_existing=True,
                max_instances=1,
            )
```

- [ ] **Step 2: Изменить send_deadline_notifications — интервал 60 сек, старт +20 сек**

В `backend/app/scheduler.py:61-68` заменить:

```python
            self.scheduler.add_job(
                self._job_send_deadline_notifications,
                'interval',
                seconds=60,
                id='send_deadline_notifications',
                replace_existing=True,
                max_instances=1,
                next_run_time=datetime.now() + timedelta(seconds=20),
            )
```

- [ ] **Step 3: Изменить send_backup_schedules — интервал 60 сек, старт +40 сек**

В `backend/app/scheduler.py:133-140` заменить:

```python
            self.scheduler.add_job(
                _job_send_backup_schedules,
                'interval',
                seconds=60,
                id='send_backup_schedules',
                replace_existing=True,
                max_instances=1,
                next_run_time=datetime.now() + timedelta(seconds=40),
            )
```

Результат: все три джобы выполняются каждые 60 секунд, но никогда не стартуют одновременно. Их запуски разнесены на 20 секунд друг от друга (0с, 20с, 40с в каждой минуте). Бекапы не пропускаются — каждая джоба гарантированно срабатывает в каждой минуте.

- [ ] **Step 4: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_scheduler.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/scheduler.py
git commit -m "perf: stagger 1-minute scheduler jobs via next_run_time offset (0/20/40s)"
```

---

### Task 4: Уменьшить объём логирования — apscheduler WARNING + точечные DEBUG

**Files:**
- Modify: `backend/app/main.py:36-39`
- Modify: `backend/app/scheduler.py` — `_job_*` методы (только сообщения со счётчиками)

Два уровня оптимизации: (а) apscheduler логгер → WARNING убирает ~2600 строк/час "Running job...executed successfully", (б) точечные INFO→DEBUG для сообщений со счётчиками ("Found 0 tasks...", "Processed 0...") в scheduler.py.

- [ ] **Step 1: Снизить уровень лога apscheduler до WARNING**

В `backend/app/main.py` после строки 39 (блок `logging.basicConfig`) добавить:

```python
logging.getLogger("apscheduler").setLevel(logging.WARNING)
```

Это уберёт логи вида "Running job ... executed successfully" от APScheduler. Ошибки (WARNING и выше) останутся.

- [ ] **Step 2: Заменить INFO на DEBUG для сообщений со счётчиками в scheduler.py**

В `backend/app/scheduler.py` заменить только сообщения со счётчиками результатов (НЕ "Running job:" — они уже скрыты Task 4 Step 1):

- `_job_send_due_reminders` (~340): `logger.info(f"Found {len(due_items)} tasks with due reminders")` → `logger.debug(...)`
- `_job_send_due_reminders` (~410): `logger.info(f"Processed {len(due_items)} due tasks for reminders")` → `logger.debug(...)`
- `_job_send_deadline_notifications` (~426): `logger.info(f"Found {len(tasks)} tasks with arrived deadlines")` → `logger.debug(...)`
- `_job_reminder_recovery` (~165): `logger.info(f"Recovery: found {len(due_items)} missed reminders")` → `logger.debug(...)`
- `_job_reminder_recovery` (~243): `logger.info(f"Recovery: sent {sent_count} missed reminders")` → `logger.debug(...)`

Оставить на INFO значимые события: привязка Telegram, успешно отправленные напоминания, ошибки.

- [ ] **Step 3: Запустить тесты**

Run: `cd backend && python -m pytest tests/ -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/main.py backend/app/scheduler.py
git commit -m "perf: set apscheduler log to WARNING, downgrade counter logs to DEBUG"
```

---

### Task 5: Увеличить интервал Docker healthcheck с 10s до 30s

**Files:**
- Modify: `docker/docker-compose.yml:13-17`

Сейчас healthcheck каждые 10 секунд = 360 запросов/час к `/health`. Для продакшена достаточно 30 секунд.

- [ ] **Step 1: Изменить интервал healthcheck**

В `docker/docker-compose.yml` заменить:

```yaml
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
```

(изменено `interval: 10s` → `interval: 30s`)

- [ ] **Step 2: Commit**

```bash
git add docker/docker-compose.yml
git commit -m "perf: increase docker healthcheck interval from 10s to 30s"
```

---

### Task 6: Исправить startup recovery bug — "Multiple rows were found when one or none was required"

**Files:**
- Modify: `backend/app/services/recurrence_service.py:55-61`
- Modify: `backend/tests/test_scheduler.py`

**Источник ошибки найден:** `recurrence_service.py:61` — метод `_find_existing_generated_task` использует `result.scalar_one_or_none()`. Запрос фильтрует по `task_id` + `func.date(due_date_of_generated_task) == due_date.date()`. Если в БД есть два `TaskRecurrence` с одним `task_id` и одинаковой датой (разное время), `func.date()` вернёт одинаковый результат → `MultipleResultsFound`.

- [ ] **Step 1: Заменить `scalar_one_or_none()` на `scalars().first()` в `_find_existing_generated_task`**

В `backend/app/services/recurrence_service.py:55-61` заменить:

```python
    async def _find_existing_generated_task(self, task_id: str, due_date: datetime) -> TaskRecurrence | None:
        stmt = select(TaskRecurrence).where(
            TaskRecurrence.task_id == task_id,
            func.date(TaskRecurrence.due_date_of_generated_task) == due_date.date(),
        ).limit(1)
        result = await self.db.execute(stmt)
        rows = result.scalars().all()
        return rows[0] if rows else None
```

`.limit(1)` гарантирует что SQLite вернёт максимум одну строку. `scalars().all()` + индексная проверка заменяет `scalar_one_or_none()` — больше не вызовет исключение при дубликатах.

- [ ] **Step 2: Добавить тест для startup recovery с несколькими задачами**

В `backend/tests/test_scheduler.py` добавить тест:

```python
@pytest.mark.asyncio
async def test_startup_recovery_multiple_recurring_tasks(db_session, user_for_scheduler):
    now = datetime.now(UTC)

    for i in range(3):
        task = Task(
            user_id=user_for_scheduler.id,
            title=f"Recurring {i}",
            due_date=now - timedelta(days=2),
            recurrence_type="daily",
            recurrence_interval=1,
            is_completed=True,
        )
        db_session.add(task)
    await db_session.commit()

    from app.services.recurrence_service import RecurrenceService

    result = await db_session.execute(
        select(Task).where(Task.user_id == user_for_scheduler.id)
    )
    tasks = list(result.scalars().all())

    for task in tasks:
        svc = RecurrenceService(db_session)
        try:
            await svc.catch_up_missed_tasks(task, max_days=7)
        except Exception as e:
            pytest.fail(f"catch_up_missed_tasks should not raise: {e}")
```

- [ ] **Step 3: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_scheduler.py tests/test_recurrence.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/recurrence_service.py backend/tests/test_scheduler.py
git commit -m "fix: resolve 'Multiple rows' error in _find_existing_generated_task"
```

---

## Итоговая оценка влияния

| Метрика | До | После | Снижение |
|---------|-----|-------|----------|
| Запуски `_job_poll_telegram_bots` / час | 720 | 0-120* | до 100% |
| Одновременные минутные джобы | 3 каждую минуту | разнесены (60с, offset 0/20/40) | нет пиков |
| Строк логов / час | ~3000+ | ~50-100 | ~97% |
| Docker healthcheck запросов / час | 360 | 120 | 67% |
| `database is locked` ошибки | периодические | значительное снижение** | — |

*\*0 когда нет пользователей для привязки (кеширование), 120 максимум (30с интервал)*

**\*\*Разнесение джоб снижает вероятность одновременной записи, но не гарантирует полное устранение — SQLite имеет один writer. WAL mode + busy_timeout=30с уже настроены и выдерживают типичную нагрузку.*

---

## Порядок выполнения

1. Task 1 (telegram polling interval) — наибольший эффект, самая простая правка
2. Task 2 (telegram polling cache) — дополняет Task 1, менять тот же файл
3. Task 3 (stagger jobs 60/70/80s) — устраняет одновременную конкуренцию за lock
4. Task 4 (apscheduler WARNING + точечные DEBUG) — логирование
5. Task 5 (docker healthcheck) — простая правка, другой файл
6. Task 6 (startup recovery bug) — отдельный баг, independent от остальных
