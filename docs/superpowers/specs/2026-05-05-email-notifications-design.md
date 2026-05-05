# Email-оповещения — Спецификация

## Цель

Добавить возможность получать оповещения о задачах и review на электронную почту с подтверждением адреса через код.

## Контекст

Существующая система оповещений:
- In-app уведомления
- Browser notifications
- Telegram-оповещения (включая e-mail для Bot API)

Новое: email-оповещения с SMTP-сервером.

## Архитектура

### 1. База данных

**Новые поля в таблице `users`:**

| Поле | Тип | Описание |
|------|-----|----------|
| `email_notifications_enabled` | BOOLEAN | Включены ли email-оповещения |
| `notification_email` | VARCHAR(255) | Подтверждённый email для оповещений |
| `email_verification_code` | VARCHAR(6) | Код верификации |
| `email_verified_at` | DATETIME | Когда email был подтверждён |

### 2. API-эндпоинты

**POST `/api/users/verify-email`** — отправить код верификации

Request:
```json
{ "email": "user@example.com" }
```

Response:
```json
{ "message": "Код отправлен" }
```

Логика:
- Проверяет, что email не занят другим пользователем
- Генерирует 6-значный код
- Отправляет письмо с кодом
- Сохраняет код в БД с TTL 15 минут

**POST `/api/users/confirm-email`** — подтвердить email кодом

Request:
```json
{ "code": "123456" }
```

Response:
```json
{ "message": "Email подтверждён", "notification_email": "user@example.com" }
```

Логика:
- Проверяет код (сравнивает, не истёк ли)
- Записывает `notification_email`
- Записывает `email_verified_at`
- Очищает `email_verification_code`

**PATCH `/api/users/me`** — обновить настройки

Новое поле: `email_notifications_enabled: boolean`

### 3. Email-сервис

**Файл:** `backend/app/services/email_service.py`

```python
class EmailService:
    async def send_verification_email(self, email: str, code: str) -> None
    async def send_deadline_reminder(self, email: str, task_title: str, deadline: datetime, user_name: str) -> None
    async def send_review_reminder(self, email: str, user_name: str, review_url: str) -> None
```

**SMTP-настройки в `.env.example`:**
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=Todowka <your-email@example.com>
```

### 4. Scheduler

**Изменения в `backend/app/scheduler.py`:**

При отправке remindr и deadline notifications:
```python
if user.email_notifications_enabled and user.notification_email:
    await email_service.send_deadline_reminder(
        user.notification_email,
        task.title,
        task.due_date,
        user.username
    )
```

При отправке review reminders:
```python
if user.review_notifications_enabled and user.notification_email:
    await email_service.send_review_reminder(
        user.notification_email,
        user.username,
        review_url
    )
```

### 5. Frontend

**User schema (TypeScript):**
```typescript
interface User {
  // ... existing fields
  email_notifications_enabled: boolean
  notification_email: string | null
  email_verified_at: string | null
}
```

**API (users.ts):**
```typescript
verifyEmail: async (email: string) => Promise<void>
confirmEmail: async (code: string) => Promise<{ notification_email: string }>
```

**UI в Settings:**
- Секция "Email-оповещения"
- Переключатель включения
- Если выключен и не подтверждён:
  - Поле ввода email
  - Кнопка "Отправить код"
  - Модалка/inline для ввода кода
- После подтверждения: показывает email с иконкой верификации

## Сценарии использования

### 1. Первичное подтверждение email
1. Пользователь вводит email в настройках
2. Нажимает "Подтвердить"
3. Получает код на email
4. Вводит код в приложении
5. Email подтверждён

### 2. Включение оповещений
1. Пользователь включает переключатель "Email-оповещения"
2. Если email не подтверждён → запрашивает подтверждение
3. Если подтверждён → оповещения включены

### 3. Смена email
1. Пользователь нажимает "Изменить email"
2. Процесс подтверждения повторяется
3. Новый email становится `notification_email`

## Обработка ошибок

- **Email занят** → "Этот email уже используется другим пользователем"
- **Неверный код** → "Неверный код, попробуйте ещё раз"
- **Код истёк** → "Код истёк, отправьте новый"
- **SMTP недоступен** → Логировать ошибку, не блокировать пользователя

## Безопасность

- Код хранится в БД, не хешируется (нужно сравнивать)
- TTL кода: 15 минут
- Ограничение: не более 3 попыток ввода за 15 минут
- Rate limiting на `/verify-email`: не более 3 писем в час на один email

## Тестирование

**Manual:**
- [ ] Отправка кода на валидный email
- [ ] Отправка кода на невалидный email (ошибка)
- [ ] Подтверждение с правильным кодом
- [ ] Подтверждение с неправильным кодом
- [ ] Подтверждение с истёкшим кодом
- [ ] Включение оповещений после подтверждения
- [ ] Получение email reminder о deadline
- [ ] Получение email reminder о review

## Зависимости

**Python:**
- `aiosmtplib` — async SMTP
- `email-validator` — валидация email

**Миграции:**
- Новая миграция: добавление полей в users