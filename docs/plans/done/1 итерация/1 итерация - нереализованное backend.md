# Итерация 1 — Нереализованные возможности (Backend)

> Глубокий анализ бэкенда по сравнению с планом `1 итерация.md`.
> Отсортировано от самого простого к сложному.
> Дата анализа: 9 апреля 2026

---

## 0. КРИТИЧЕСКИЕ БАГИ (обнаружены при анализе)

### БАГ #1: `NameError` при регистрации без `max_users`

**Файл:** `backend/app/api/auth.py:67`

**Суть:** Переменная `user_count` используется на строке 67 (`is_first_user = user_count == 0`), но определяется только внутри блока `if settings.max_users:` (строка 44-46). Если `max_users` не задан (по умолчанию `None`) — первый зарегистрированный пользователь **получит `NameError`**.

```python
# Строка 44-51: user_count определяется ТОЛЬКО если max_users задан
if settings.max_users:
    result = await db.execute(select(func.count(User.id)))
    user_count = result.scalar() or 0
    if user_count >= settings.max_users:
        raise HTTPException(...)

# Строка 67: user_count используется ВСЕГДА — NameError если max_users=None!
is_first_user = user_count == 0
```

**Сейчас это работает**, потому что в `.env` стоит `MAX_USERS=3`. Но если убрать — падение.

**Объём работы:** 5 мин.

---

### БАГ #2: Тест `test_login_inactive_user` не пройдёт

**Файл:** `backend/tests/test_auth.py:156`

**Суть:** Тест ожидает `"Inactive user"` в `detail`, но endpoint `/api/auth/login` возвращает `"User is blocked"` (строка 100 в `auth.py`).

```python
# Тест:
assert "Inactive user" in response.json()["detail"]
# Реальность:
detail="User is blocked"
```

**Объём работы:** 2 мин — исправить assertion.

---

## 1. WAL mode не включён

**Задача #7** | Приоритет: 🔴 | Сложность: **Очень простая**

**План:** SQLAlchemy async engine + aiosqlite + включение WAL mode. Настройка через `connect_args` или SQLAlchemy event hook `PRAGMA journal_mode=WAL`.

**Реальность:** `database.py` создаёт engine с `connect_args={"check_same_thread": False}`, но WAL mode нигде не включён. SQLite работает в режиме по умолчанию (DELETE journal), что медленнее при конкурентных чтениях/записях.

**Объём работы:** 15 мин — добавить SQLAlchemy event listener для выполнения `PRAGMA journal_mode=WAL`.

---

## 2. `datetime.utcnow()` — deprecated в Python 3.12+

**Задача #12** | Приоритет: 🟡 | Сложность: **Очень простая**

**План:** Современный Python 3.12.

**Реальность:** `security.py` (строки 29, 31, 40, 42) использует `datetime.utcnow()`, что deprecated с Python 3.12. Нужно заменить на `datetime.now(datetime.UTC)`.

**Объём работы:** 10 мин.

---

## 3. Логирование не настроено

**Задача #2** | Приоритет: 🟡 | Сложность: **Простая**

**План:** `LOG_LEVEL` env-переменная используется для настройки логирования.

**Реальность:** Переменная `LOG_LEVEL` есть в `config.py`, но нигде не используется. В `main.py` нет `logging.basicConfig()` или подобной настройки. Логи приложения не управляются через конфигурацию.

**Объём работы:** 30 мин — настроить `logging` в `main.py` на основе `settings.log_level`.

---

## 4. Нет тестов для пользователей (admin endpoints)

**Задача — расширение** | Приоритет: 🟡 | Сложность: **Простая**

**План:** Тесты всех backend-эндпоинтов.

**Реальность:** 37 тестов покрывают только auth и tasks. Нет тестов для:
- `GET /api/users` — список пользователей (admin)
- `PATCH /api/users/{id}/block` — блокировка
- `PATCH /api/users/{id}/unblock` — разблокировка
- `DELETE /api/users/{id}` — удаление пользователя
- Попытка не-админа обратиться к admin-эндпоинтам → 403
- Попытка заблокировать/удалить самого себя → 400
- Попытка заблокировать/удалить другого админа → 400

**Объём работы:** 2 часа.

---

## 5. Нет тестов для `/api/config` и `/api/stats`

**Задача — расширение** | Приоритет: 🟡 | Сложность: **Простая**

**Реальность:** Два endpoint-а полностью без тестов:
- `GET /api/config` — проверка полей `registration_enabled`, `max_users`, `current_users`, `registration_available`
- `GET /api/stats` — проверка всех 7 полей статистики

**Объём работы:** 1 час.

---

## 6. Нет тестов для invite code и max_users

**Задача #47** | Приоритет: 🟡 | Сложность: **Простая**

**План:** Тест регистрации с отключённой регистрацией, invite code, лимитом пользователей.

**Реальность:** Тест `test_register_disabled` есть, но нет:
- Теста с корректным invite code → успех
- Теста с неверным invite code → 403
- Теста с invite code когда он не задан → успех без кода
- Теста достижения max_users → 403
- Теста когда max_users не задан → неограниченная регистрация

**Объём работы:** 1 час.

---

## 7. Задачи возвращают 404 вместо 403 при доступе к чужой задаче

**Задача #25–30** | Приоритет: 🔴 | Сложность: **Простая**

**План:** Каждый endpoint проверяет, что задача принадлежит текущему пользователю — **403 иначе**.

**Реальность:** `TaskService.get_task()`, `update_task()`, `toggle_task()`, `delete_task()` ищут задачу с фильтром `user_id`. Если задача существует, но принадлежит другому пользователю — возвращается `None`, и endpoint отдаёт **404** "Task not found". Это скрывает факт существования чужой задачи, что с точки зрения безопасности может быть даже лучше (не раскрывает информацию). Но **не соответствует плану**.

**Вопрос:** Стоит ли менять? 404 leaking less info than 403. Это осознанное дизайнерское решение, которое нужно зафиксировать.

**Объём работы:** 30 мин — если решите менять; 0 мин — если зафиксируете в документации.

---

## 8. Stats: неточная статистика completed_week/completed_month

**Задача — расширение** | Приоритет: 🟡 | Сложность: **Средняя**

**Суть:** `stats.py` определяет «выполнено за неделю/месяц» по `updated_at >= week_ago AND is_completed`. Но `updated_at` обновляется при ЛЮБОМ изменении задачи (переименование, изменение описания). Если задача была выполнена месяц назад, а сегодня изменили title — она попадёт в «выполнено за неделю».

**Нет поля `completed_at`** — только `is_completed` + `updated_at`.

**Решения:**
1. Добавить колонку `completed_at` (nullable, заполняется при toggle → True)
2. Или принять неточность и задокументировать

**Объём работы:** 2 часа — добавить колонку + миграцию + обновить toggle логику.

---

## 9. Stats: 6 отдельных запросов вместо 1–2

**Задача — производительность** | Приоритет: 🟢 | Сложность: **Средняя**

**Суть:** `GET /api/stats` делает 6 отдельных SQL-запросов к БД. Можно объединить в 1–2 запроса с `CASE WHEN`:

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN created_at >= :week_ago THEN 1 ELSE 0 END) as created_week,
  ...
FROM tasks WHERE user_id = :user_id
```

**Объём работы:** 1 час.

---

## 10. Нет валидации сложности пароля

**Задача #13** | Приоритет: 🟡 | Сложность: **Средняя**

**План:** Валидация пароля: длина ≥ 8 (реализовано). В плане также упомянута «zod-подобная проверка».

**Реальность:** Только `min_length=8` в Pydantic-схеме. Нет проверки на:
- Хотя бы одну цифру
- Хотя бы одну заглавную букву
- Хотя бы один спецсимвол
- Совпадение с username/email

**Объём работы:** 1 час — добавить Pydantic validator в `RegisterRequest`.

---

## 11. Нет rate limiting

**Задача — безопасность** | Приоритет: 🟡 | Сложность: **Средняя**

**План:** Неявно требуется из раздела «Безопасность».

**Реальность:** Нет защиты от брутфорса на `/api/auth/login`. Нет лимита на количество регистраций. Нет middleware для rate limiting.

**Решения:**
- `slowapi` — simple rate limiting для FastAPI
- nginx rate limiting (на уровне reverse proxy)
- Оба варианта

**Объём работы:** 2 часа.

---

## 12. Нет refresh token revocation (blacklist)

**Задача #15** | Приоритет: 🟡 | Сложность: **Сложная**

**План:** Ротация refresh token (старый инвалидируется).

**Реальность:** Refresh tokens — stateless JWT. «Инвалидация» старого токена происходит только через ротацию (новый токен при refresh). Но если кто-то украл refresh token до ротации — он валиден до истечения. Нет:
- Таблицы отозванных токенов
- Проверки token revoked в `/api/auth/refresh`
- Массового logout (отозвать все refresh tokens пользователя)

**Объём работы:** 4 часа — добавить таблицу revoked_tokens + проверку.

---

## 13. Нет `/.env.example` согласованности с планом

**Задача #55** | Приоритет: 🟡 | Сложность: **Простая**

**План:**
```
REGISTRATION_ENABLED=true
# INVITE_CODE=optional-secret-code
```

**Реальность:** В `.env.example`:
```
REGISTRATION_ENABLED=true
MAX_USERS=
INVITE_CODE=
```

Плюс добавлены `max_users`, которых не было в оригинальном плане. Это не баг, а расширение. Но `INVITE_CODE` в плане был закомментирован как опция, а в `.env.example` — пустое значение (приведёт к `str` вместо `None`).

**Проверить:** `invite_code: str | None = None` — пустая строка `""` будет воспринята как `str`, а не `None`. Нужно `invite_code: str | None = None` с валидатором `@field_validator("invite_code", mode="before")` для конвертации `""` → `None`.

**Объём работы:** 30 мин.

---

## 14. CI: type-check команда не совсем корректна

**Задача #6** | Приоритет: 🟡 | Сложность: **Простая**

**План:** GitHub Actions: backend — lint (ruff), pytest. frontend — lint (eslint), type-check (tsc --noEmit), build.

**Реальность:** CI есть в `.github/workflows/ci.yml` и выглядит хорошо. Но:
- Backend type-check: `ruff check --select I .` — это проверка **import sorting**, а не type checking. Для настоящей проверки типов нужен `mypy .`
- Frontend type-check: `npx tsc --noEmit -p frontend/` — путь `-p frontend/` может быть некорректным (запуск из `./frontend/`, проект уже в текущей директории)

**Объём работы:** 30 мин — исправить команды.

---

## 15. Миграции: неконсистентные имена файлов

**Задача #11** | Приоритет: 🟢 | Сложность: **Простая**

**План:** Начальная миграция `001_initial_schema`.

**Реальность:** 3 миграции с разными форматами имён:
- `0513b209aa1d_initial_schema.py` — hex ID
- `add_admin_fields_add_admin_fields.py` — custom string ID
- `20260409_2150_6e177ba42dbf_drop_is_blocked_column_from_users.py` — timestamp + hex

Не критично, но затрудняет отслеживание порядка миграций.

**Объём работы:** 15 мин — переименовать (или просто зафиксировать конвенцию).

---

## 16. Нет health-check содержательной информации

**Задача — расширение** | Приоритет: 🟢 | Сложность: **Простая**

**Реальность:** `GET /health` возвращает `{"status": "healthy"}`. Не проверяет:
- Доступность БД
- Миграции применены (alembic_version)

План не требует этого явно, но это best practice.

**Объём работы:** 30 мин.

---

## ИТОГОВАЯ СВОДНАЯ ТАБЛИЦА

| # | Что не реализовано / баг | Сложность | Время | Приоритет |
|---|---|---|---|---|
| БАГ #1 | NameError при регистрации без max_users | Очень простая | 5 мин | 🔴 КРИТИЧНО |
| БАГ #2 | Тест inactive user: неверный assertion | Очень простая | 2 мин | 🔴 КРИТИЧНО |
| 1 | WAL mode не включён | Очень простая | 15 мин | 🔴 |
| 2 | `datetime.utcnow()` deprecated | Очень простая | 10 мин | 🟡 |
| 3 | Логирование не настроено (LOG_LEVEL) | Простая | 30 мин | 🟡 |
| 4 | Нет тестов admin endpoints (/users/*) | Простая | 2 ч | 🟡 |
| 5 | Нет тестов /config и /stats | Простая | 1 ч | 🟡 |
| 6 | Нет тестов invite code + max_users | Простая | 1 ч | 🟡 |
| 7 | 404 вместо 403 при доступе к чужой задаче | Простая | 30 мин | 🔴 |
| 8 | Неточная статистика completed (нет completed_at) | Средняя | 2 ч | 🟡 |
| 9 | Stats: 6 запросов вместо 1–2 | Средняя | 1 ч | 🟢 |
| 10 | Нет валидации сложности пароля | Средняя | 1 ч | 🟡 |
| 11 | Нет rate limiting на login/register | Средняя | 2 ч | 🟡 |
| 12 | Нет refresh token blacklist/revocation | Сложная | 4 ч | 🟡 |
| 13 | invite_code: пустая строка vs None | Простая | 30 мин | 🟡 |
| 14 | CI: type-check команды не корректны | Простая | 30 мин | 🟡 |
| 15 | Неконсистентные имена миграций | Простая | 15 мин | 🟢 |
| 16 | Health-check не проверяет БД | Простая | 30 мин | 🟢 |

---

## ЧТО РЕАЛИЗОВАНО ИЗ ПЛАНА (Backend-задачи #1–55)

| Задача # | Блок | Описание | Статус |
|---|---|---|---|
| 1 | Инфра | Монорепо + .gitignore + .editorconfig | ✅ |
| 2 | Инфра | FastAPI + структура пакетов + Pydantic Settings | ✅ |
| 4 | Инфра | Docker: Dockerfile backend + docker-compose.yml | ✅ |
| 5 | Инфра | Nginx: проксирование /api/* → backend, SPA | ✅ |
| 6 | Инфра | GitHub Actions CI | ⚠️ Команды type-check некорректны |
| 7 | БД | SQLAlchemy async + aiosqlite | ⚠️ Нет WAL mode |
| 8 | БД | Модель users (UUID, username, email, password_hash, is_active, timestamps) | ✅ (+ is_admin) |
| 9 | БД | Модель tasks (UUID, user_id FK, title, description, is_completed, timestamps) | ✅ |
| 10 | БД | SQL-индексы | ✅ (ix_tasks_user_id, ix_tasks_user_id_is_completed, ix_users_username, ix_users_email) |
| 11 | БД | Alembic + начальная миграция | ✅ |
| 12 | Auth | security.py: bcrypt, JWT encode/decode | ⚠️ utcnow deprecated |
| 13 | Auth | POST /api/auth/register + REGISTRATION_ENABLED guard | ⚠️ Баг NameError |
| 14 | Auth | POST /api/auth/login + access token + refresh cookie | ✅ |
| 15 | Auth | POST /api/auth/refresh + ротация | ✅ (но нет blacklist) |
| 16 | Auth | POST /api/auth/logout + удаление cookie | ✅ |
| 17 | Auth | GET /api/auth/me | ✅ |
| 18 | Auth | Dependency get_current_user | ✅ (+ get_current_admin_user) |
| 19 | Auth | Pydantic schemas auth | ✅ |
| 25 | Tasks | POST /api/tasks | ✅ |
| 26 | Tasks | GET /api/tasks + пагинация | ✅ |
| 27 | Tasks | GET /api/tasks/{id} | ✅ (404 вместо 403) |
| 28 | Tasks | PUT /api/tasks/{id} | ✅ (404 вместо 403) |
| 29 | Tasks | PATCH /api/tasks/{id}/toggle | ✅ |
| 30 | Tasks | DELETE /api/tasks/{id} | ✅ |
| 31 | Tasks | Pydantic schemas tasks | ✅ |
| 32 | Tasks | TaskService | ✅ |
| 47 | Тесты BE | Тесты регистрации | ⚠️ 4/7 (нет invite_code, max_users) |
| 48 | Тесты BE | Тесты логина | ⚠️ 3/3 (1 баг в assertion) |
| 49 | Тесты BE | Тесты refresh token | ✅ 2/2 |
| 50 | Тесты BE | Тесты CRUD задач | ✅ |
| 51 | Тесты BE | Доступ к чужой задаче | ✅ (404 вместо 403) |
| 54 | Доки | README.md | ✅ |
| 55 | Доки | .env.example | ✅ |

---

## ДОПОЛНИТЕЛЬНОЕ (не в плане, но реализовано)

| Функция | Файлы | Комментарий |
|---|---|---|
| Admin-пользователи (is_admin) | models/user.py, dependencies.py | Первый пользователь = admin |
| Управление пользователями (admin) | api/users.py, schemas/auth.py | CRUD для admin |
| Конфигурация регистрации | api/config.py, schemas/config.py | GET /api/config |
| Статистика задач | api/stats.py, schemas/stats.py | GET /api/stats |
| Invite code | config.py, api/auth.py | Опциональный код приглашения |
| Max users limit | config.py, api/auth.py | Ограничение числа пользователей |
| Проверка is_blocked при логине | api/auth.py | 401 для заблокированных |
| Docker SSL + HTTP варианты | docker/ | nginx-http.conf, nginx-ssl.conf, docker-compose variants |
| Deploy скрипты | docker/deploy.sh, deploy-ssl.sh | Автодеплой |
| CI + Deploy workflows | .github/workflows/ | ci.yml + deploy.yml |

---

## ОБЩАЯ ОЦЕНКА BACKEND

### Покрытие плана итерации 1 (backend-задачи):

| Фаза | Задачи | Статус |
|---|---|---|
| A — Фундамент | #1,2,4,5,7–11 | ✅ ~95% (нет WAL mode) |
| B — Auth Backend | #12–19 | ⚠️ ~90% (баг NameError, нет token blacklist) |
| D — Tasks Backend | #25–32 | ✅ 100% (404 вместо 403 — дизайнерское решение) |
| G — Тесты | #47–51 | ⚠️ ~70% (нет тестов admin, config, stats, invite_code) |
| H — CI + Доки | #6,54,55 | ⚠️ ~85% (CI type-check некорректен) |

### Критерии приёмки итерации 1 (backend-часть):

| Критерий | Статус |
|---|---|
| Регистрация | ⚠️ Баг NameError без max_users |
| Логин/Логаут | ✅ |
| Refresh | ✅ |
| CRUD задач | ✅ |
| Изоляция данных | ✅ (через 404) |
| Docker | ✅ |
| CI green | ⚠️ Тест inactive user падает |

---

## Рекомендуемый порядок доработки:

1. **БАГ #1:** Исправить NameError в register (5 мин)
2. **БАГ #2:** Исправить assertion в test_login_inactive_user (2 мин)
3. Включить WAL mode (15 мин)
4. Заменить `datetime.utcnow()` → `datetime.now(datetime.UTC)` (10 мин)
5. Исправить invite_code: пустая строка → None (30 мин)
6. Исправить CI type-check команды (30 мин)
7. Настроить логирование через LOG_LEVEL (30 мин)
8. Добавить тесты admin endpoints (2 ч)
9. Добавить тесты config + stats (1 ч)
10. Добавить тесты invite_code + max_users (1 ч)
11. Валидация сложности пароля (1 ч)
12. Добавить completed_at колонку (2 ч)
13. Оптимизировать stats запросы (1 ч)
14. Добавить rate limiting (2 ч)
15. Refresh token blacklist (4 ч)

**Общее время на доработку backend: ~13–16 часов**
