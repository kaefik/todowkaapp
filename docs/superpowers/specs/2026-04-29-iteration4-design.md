# Итерация 4 — Design Spec

**Дата:** 2026-04-29
**Статус:** Approved

---

## Обзор

6 фич: Weekly Review wizard, управление сессиями, анимации, SQL-индексы, rate limiting, security audit.

### Порядок реализации

```
Фаза 1 — Быстрые победы (1-2 дня)
  ├── SQL-индексы (миграция)
  ├── Rate limiting (per-endpoint, через slowapi)
  └── Security audit базовый (зависимости, JWT, cookies)

Фаза 2 — Сессии (2-3 дня)
  ├── Backend: модель Session + API + SessionService
  ├── Frontend: секция в Security tab Settings
  └── Интеграция в auth flow

Фаза 3 — Weekly Review (3-4 дня)
  ├── Backend: API + ReviewService + расширение User
  ├── Frontend: полноэкранный wizard + 3 шага
  └── Напоминание в sidebar

Фаза 4 — Polish (1-2 дня)
  ├── CSS анимации (keyframes + reduced motion)
  ├── Modal, list, sidebar animations
  ├── Security headers middleware
  └── Финальный security code review
```

---

## Фича 1: Weekly Review Wizard

### Layout
Полноэкранный wizard (sidebar скрыт, progress bar сверху). Маршрут `/review`, защищённый.

### 3 шага

**Шаг 1 — ReviewInbox:** список inbox-задач с быстрыми действиями:
- «Сделать» → перемещает в Active
- «Когда-нибудь» → перемещает в Someday
- «Удалить» → в корзину
- Dropdown «Ещё» → «В проект»
- Счётчик «X из Y обработано»

**Шаг 2 — ReviewProjects:** активные проекты:
- Красный индикатор если нет задачи с `gtd_status='active'`
- Кнопка «Добавить next action» → inline mini-form

**Шаг 3 — ReviewSomeday:** someday-задачи:
- «Активировать» → в Active
- «В корзину» → trashed
- «Оставить» → без изменений

### Завершение
Экран со статистикой (обработано inbox, проектов без next action, someday активировано). `POST /api/review/complete`.

### Напоминание
Баннер в sidebar «Время для обзора» если `last_review_at` > 7 дней.

### Backend
- `GET /api/review/status` — агрегированные данные (inbox_count, inbox_tasks, active_projects с has_next_action, someday_tasks, last_review_date, review_count)
- `POST /api/review/complete` — сохраняет last_review_at, увеличивает review_count
- `ReviewService` — инкапсулирует логику
- User model: добавить `last_review_at: datetime | None`, `review_count: int = 0`
- Миграция

### Frontend компоненты
```
src/routes/Review.tsx              — контейнер, state machine шагов
src/components/review/
  ReviewWizard.tsx                 — wrapper с progress bar + навигация
  ReviewInbox.tsx                  — шаг 1
  ReviewProjects.tsx               — шаг 2
  ReviewSomeday.tsx                — шаг 3
```

---

## Фича 2: Управление сессиями

### Backend модель Session
```python
class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[str]                    # UUID, PK
    user_id: Mapped[str]               # FK -> users.id (String(36))
    refresh_token_jti: Mapped[str]     # JTI refresh-токена, unique
    user_agent_raw: Mapped[str | None] # Raw User-Agent строка
    browser: Mapped[str | None]        # Распарсенный браузер
    os: Mapped[str | None]             # Распарсенная ОС
    device_type: Mapped[str | None]    # desktop/mobile/tablet
    ip_address: Mapped[str | None]
    created_at: Mapped[datetime]
    last_activity: Mapped[datetime]
```

Индексы: `(user_id)`, `(refresh_token_jti, unique)`.

### User-Agent парсинг
Библиотека `user-agents` (или `httpagentparser`) на backend. Парсит browser, os, device_type. Raw строка тоже сохраняется.

### API
```
GET    /api/sessions           — список активных сессий
DELETE /api/sessions/{id}      — отзыв конкретной сессии
DELETE /api/sessions           — выйти со всех устройств (кроме текущей)
```

### Интеграция auth flow
- **Login:** создать Session запись, вернуть `session_id` в JSON response
- **Refresh:** обновить `last_activity` в Session
- **Logout:** удалить Session запись + отозвать refresh token
- **Смена пароля:** удалить все Session пользователя кроме текущей

### Frontend
- Секция внутри tab Security в Settings (не новый tab)
- `session_id` хранится в authStore (memory, не persist)
- Карточки сессий: иконка устройства, браузер, ОС, IP, даты
- Текущая сессия — бейдж «Текущая»
- Кнопка «Выйти со всех устройств» с confirm dialog

Компоненты:
```
src/components/sessions/
  SessionList.tsx
  SessionCard.tsx
  RevokeAllButton.tsx
```

---

## Фича 3: Анимации (Polish)

### Подход: CSS-only
Без Framer Motion. CSS `@keyframes` + utility классы.

### Базовые анимации (index.css)
```css
@keyframes fadeIn     { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp    { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes slideDown  { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes scaleIn    { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }

.animate-fade-in    { animation: fadeIn 200ms ease-out }
.animate-slide-up   { animation: slideUp 200ms ease-out }
.animate-slide-down { animation: slideDown 200ms ease-out }
.animate-scale-in   { animation: scaleIn 150ms ease-out }
```

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Применение
- **Модалки:** `animate-scale-in` на content, `animate-fade-in` на overlay (TaskDetailModal, TaskEditModal, ConfirmDialog, DeleteAccountModal)
- **Списки задач:** `animate-slide-up` с stagger через `animation-delay`
- **Sidebar toggle:** `transition: width 200ms ease`
- **Page transitions:** View Transitions API с fallback на прямую навигацию

---

## Фича 4: SQL-индексы

### Миграция
5 индексов:
- `ix_projects_user_id` на `projects(user_id)`
- `ix_areas_user_id` на `areas(user_id)`
- `ix_contexts_user_id` на `contexts(user_id)`
- `ix_verb_templates_user_id` на `verb_templates(user_id)`
- `ix_tasks_user_updated` на `tasks(user_id, updated_at)`

### Модели
Добавить `index=True` в: `Project.user_id`, `Area.user_id`, `Context.user_id`, `VerbTemplate.user_id`.
Композитный индекс `__table_args__` для `Task(user_id, updated_at)`.

---

## Фича 5: Rate Limiting

### Подход: Per-endpoint
Использовать существующий slowapi. Создать `backend/app/rate_limit.py`.

### Категории лимитов (через .env)
| Категория | Лимит | Эндпоинты |
|-----------|-------|-----------|
| Auth | 3/мин (уже есть) | login, register |
| Write | 20/мин | POST/PUT/PATCH/DELETE роутеры |
| Read | 60/мин | GET роутеры |
| SSE | 5/мин | `/api/sse/*` |
| Export | 5/мин | `/api/export-import/*` |

### Конфигурация
```env
RATE_LIMIT_WRITE=20/minute
RATE_LIMIT_READ=60/minute
RATE_LIMIT_SSE=5/minute
RATE_LIMIT_EXPORT=5/minute
```

Применять через декораторы `@limiter.limit(...)` на роутерах.

---

## Фича 6: Security Audit

### Чеклист
1. Все API endpoints используют авторизацию
2. SQL injection — все запросы через SQLAlchemy ORM
3. XSS — нет dangerouslySetInnerHTML
4. Error responses не утекают stack traces/SQL
5. `pip audit` + `npm audit` — проверить зависимости
6. JWT: secret из env, HS256, expiry (access 15мин, refresh 7дней), rotation
7. Cookies: httpOnly, Secure (prod), SameSite=lax, Path
8. Pydantic схемы валидируют все input
9. Pagination: лимит на page size

### Cleanup RevokedToken
Фоновая задача через APScheduler (уже есть в lifespan). Раз в сутки удалять записи старше 7 дней.

### Security Headers middleware
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Критерии готовности

1. SQL-индексы — миграция применена, EXPLAIN QUERY PLAN подтверждает
2. Rate limiting — все API покрыты, 429 обрабатывается frontend
3. Сессии — можно увидеть, отозвать одну или все
4. Weekly Review — 3 шага wizard проходят, данные сохраняются
5. Анимации — модалки/списки плавные, reduced motion работает
6. Security audit — чеклист пройден, нет критических уязвимостей
7. `docs/features.md` обновлён
8. Линтеры и тесты проходят
