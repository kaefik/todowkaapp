# Telegram Mini App — Дизайн документ

**Дата:** 2026-05-06
**Статус:** Утверждён

## 1. Обзор проекта

**Название:** Todowka Telegram Mini App
**Тип:** Mini App для Telegram
**Описание:** Альтернативный UI для существующего Todowka-приложения, работающий внутри Telegram WebView. Использует тот же backend API, что и PWA-версия.
**Целевые пользователи:** Пользователи Todowka, предпочитающие управлять задачами через Telegram

## 2. Архитектура

### Стек технологий
- **Frontend:** React 18 + TypeScript + Vite
- **Сборка:** Отдельная сборка для Telegram (tg-скрипт в package.json)
- **Интеграция:** Telegram WebApp API (`telegram-web-app.js`)
- **Аутентификация:** OAuth через Telegram-бот (привязка аккаунта)

### Структура проекта
```
frontend/
├── src/
│   ├── components/        # Переиспользуемые компоненты
│   ├── tg/              # Telegram-специфичный код
│   │   ├── WebApp.tsx    # Telegram WebApp инициализация
│   │   ├── useTgTheme.ts # Хук для темы Telegram
│   │   └── tghooks.ts   # Telegram-специфичные хуки
│   ├── routes/
│   │   ├──TgMain.tsx    # Главный экран Telegram
│   │   ├──TgTaskList.tsx
│   │   ├──TgTaskEdit.tsx
│   │   ├──TgSettings.tsx
│   │   └──TgProjects.tsx
│   └── ...
├── index-tg.html         # Точка входа для Telegram
├── vite.config.ts        # Расширен конфигом для Telegram
└── package.json       # Добавлен скрипт "build:tg"
```

### Связь с backend
- Использует существующий API (`/api/*`)
- Тот же механизм аутентификации (JWT в cookies)
- SSE для real-time обновлений

## 3. UI/UX Спецификация

### 3.1 Навигация
- **Тип:** Bottom tab bar (5 иконок)
- **Иконки:** 📥 Входящие | 🎯 Next | 📅 Сегодня | 📂 Проекты | ⚙️ Настройки
- **Поведение:** Telegram Haptic feedback при нажатии

### 3.2 Цветовая схема
Использует Telegram Theme API (`window.Telegram.WebApp.themeParams`):
- `button_primary_color` — #5c6bc0 (indigo)
- `button_secondary_color` — #e8eaf6
- `text_color` — #000000
- `hint_color` — #666666
- `secondary_bg_color` — #f5f5f5

Fallback цвета для случая когда theme недоступен.

### 3.3 Компоненты

**TgTaskCard:**
- Чекбокс слева
- Заголовок задачи
- Deadline с иконкой (если есть)
- Haptic feedback при toggle

**TgBottomNav:**
- 5 фиксированных табов
- Активный таб подсвечен
- Badge для count ( inbox)

**TgFab (новая задача):**
- Плавающая кнопка справа внизу
- Открывает модалку создания

**TgTaskModal:**
- Поля: заголовок, описание, дедлайн, время, проект
- Глаголы-чипы
- Кнопки сохранить/отмена

### 3.4 Адаптивность
- Оптимизировано для мобильных (320px — 428px)
- Full-width карточки задач
- Паддинги: 8px-16px

## 4. Ф��нкциональная спецификация

### 4.1 Аутентификация
**OAuth через Telegram-бот:**
1. Пользователь открывает Mini App
2. Mini App получает `initData` от Telegram
3. Отправляет `initData` на `/api/auth/telegram-login`
4. Backend валидирует через Telegram Bot API
5. Создаёт/обновляет сессию
6. Возвращает JWT

**Привязка аккаунта:**
- В Settings: "Привязать Telegram"
- Генерирует ссылку с токеном для бота
- Пользователь переходит в бот, подтверждает
- Аккаунт привязан к Telegram username

### 4.2 Управление задачами
- CRUD задач (полный функционал)
- GTD статусы: inbox, active, next, waiting, someday, completed, trash
- Projects, Contexts, Areas, Tags
- Subtasks
- Recurrence
- Календарь (отдельный экран)
- Weekly Review (отдельный экран)

### 4.3 Real-time
- SSE для уведомлений
- Автоматическое обновление списков

## 5. API Endpoints

### Новые endpoint-ы
```python
# POST /api/auth/telegram-login
# Тело: {"init_data": "..."}
# Ответ: {"access_token": "...", "user": {...}}

# POST /api/auth/bind-telegram
# Тело: {"token": "..."}
# Ответ: {"success": true}

# POST /api/auth/telegram-logout
# Тело: {}
# Ответ: {"success": true}
```

### Используемые существующие
- Все `/api/tasks/*`
- Все `/api/projects/*`
- Все `/api/contexts/*`
- Все `/api/areas/*`
- Все `/api/tags/*`
- Все `/api/calendar-events/*`
- `/api/sse/notifications`

## 6. Критерии приёмки

- [ ] Mini App открывается из Telegram бота
- [ ] Авторизация через Telegram работает
- [ ] Список задач загружается и отображается
- [ ] Создание задачи работает
- [ ] Toggle задачи работает
- [ ] Смена GTD статуса работает
- [ ] Проекты отображаются
- [ ] Настройки сохраняются
- [ ] Haptic feedback работает
- [ ] Тема соответствует Telegram (светлая/тёмная)
- [ ] Билд успешен (`npm run build:tg`)
- [ ] PWA манифест для установки

## 7. План реализации

### Фаза 1: Базовая интеграция
1. Настройка проекта для Telegram-сборки
2. Интеграция Telegram WebApp API
3. Инициализация WebApp с theme
4. OAuth endpoint на backend

### Фаза 2: UI компоненты
1. TgTaskCard
2. TgBottomNav
3. TgTaskList
4. TgTaskModal/Form
5. TgSettings

### Фаза 3: Функционал
1. Подключение API
2. Аутентификация
3. CRUD задач
4. GTD статусы
5. Проекты, контексты, теги

### Фаза 4: Advanced
1. Calendar
2. Weekly Review
3. SSE
4. Haptic feedback
5. Оптимизация

### Фаза 5: Деплой
1. Билд скрипт
2. Хостинг
3. Привязка к боту