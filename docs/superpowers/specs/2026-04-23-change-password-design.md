# Спецификация: Смена пароля пользователя

**Дата:** 2026-04-23
**Статус:** Утверждён

## Контекст

`PATCH /api/users/me` принимает поле `password` без проверки текущего пароля. На фронтенде UI для смены пароля отсутствует. Необходимо добавить безопасный механизм смены пароля с подтверждением текущим паролем.

## Решение

### Backend

#### 1. Новая Pydantic-схема `ChangePasswordRequest`
**Файл:** `backend/app/schemas/auth.py`

Поля:
- `current_password: str` — текущий пароль пользователя
- `new_password: str` — новый пароль с той же валидацией что в `RegisterRequest` (8-100 символов, минимум 1 цифра, 1 заглавная `\p{Lu}`, 1 спецсимвол `[^\p{L}\p{N}]`)

#### 2. Поле `password_changed_at` в модели User
**Файл:** `backend/app/models/user.py`

Добавить колонку:
```python
password_changed_at = Column(DateTime(timezone=True), nullable=True)
```

Используется для инвалидации refresh-токенов, выпущенных до смены пароля.

#### 3. Миграция Alembic
```bash
alembic revision --autogenerate -m "add_password_changed_at_to_users"
```

#### 4. Эндпоинт `POST /api/auth/change-password`
**Файл:** `backend/app/api/auth.py`

Зависимости: `get_current_user`

Поведение:
1. Проверить `verify_password(request.current_password, user.password_hash)` — 400 "Неверный текущий пароль" при несовпадении
2. Валидация `new_password` через Pydantic-схему (автоматически)
3. Проверить `new_password != current_password` — 400 "Новый пароль совпадает с текущим"
4. Обновить: `user.password_hash = hash_password(new_password)`, `user.password_changed_at = datetime.now(timezone.utc)`
5. Отозвать текущий refresh JTI (добавить в `revoked_tokens`)
6. Выпустить новые access+refresh cookies
7. Вернуть `{"message": "Пароль успешно изменён"}`

#### 5. Добавить `iat` в refresh-токен
**Файл:** `backend/app/security.py`

В `create_refresh_token`: добавить `"iat": now` в payload для поддержки проверки возраста токена.

#### 6. Проверка в `POST /api/auth/refresh`
**Файл:** `backend/app/api/auth.py`

После декодирования refresh-токена и получения юзера:
- Если `user.password_changed_at` установлен и `token_payload.get("iat")` существует:
  - Преобразовать `iat` (unix timestamp) в datetime
  - Если `iat_datetime < user.password_changed_at` — отозвать JTI, вернуть 401

Токены без `iat` (старый формат) пропускаются для обратной совместимости.

### Frontend

#### 7. API-метод `changePassword`
**Файл:** `frontend/src/api/users.ts`

```typescript
changePassword(currentPassword: string, newPassword: string): Promise<void>
```

Вызывает `POST /api/auth/change-password` с `{current_password, new_password}`.

#### 8. Вкладка «Безопасность» в Settings
**Файл:** `frontend/src/routes/Settings.tsx`

Новая вкладка (security) с формой:
- Поле «Текущий пароль» (type=password)
- Поле «Новый пароль» (type=password) — с подсказками требований
- Поле «Подтвердите новый пароль» (type=password)
- Кнопка «Изменить пароль»

Валидация: Zod-схема с теми же правилами что при регистрации + проверка совпадения паролей.

Обработка:
- Успех: toast «Пароль успешно изменён», сброс формы
- 400: inline-ошибка «Неверный текущий пароль»
- 422: inline-ошибки валидации

#### 9. Документация
**Файл:** `docs/features.md`

Добавить запись о смене пароля в соответствующую категорию.

## Границы

**Входит:**
- Форма смены пароля в настройках
- Бэкенд-эндпоинт с проверкой текущего пароля
- Инвалидация сессий на других устройствах

**Не входит:**
- Восстановление пароля («забыли пароль»)
- Email-уведомления о смене пароля
- Двухфакторная аутентификация
- История смен пароля
