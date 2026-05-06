# Как протестировать Telegram Mini App

## Предварительные требования

1. **Telegram бот** — создан через @BotFather
2. **Хостинг** — для Mini App (Vercel, Netlify, Railway, или любой HTTP хостинг)
3. **Деплой** — собранная версия в `dist-tg/`

---

## Шаг 1: Сборка и деплой

### Сборка
```bash
cd frontend
npm run build:tg
```

Результат в `dist-tg/`

### Деплой (варианты)

**Vercel (рекомендуется):**
```bash
npm i -g vercel
vercel deploy dist-tg/ --prod
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy dist-tg/ --prod
```

**GitHub Pages:**
```bash
# Включить Pages в настройках репозитория
# Деплой из папки dist-tg/
```

Полученный URL: `https://your-app.vercel.app`

---

## Шаг 2: Настройка Telegram бота

###Menu к @BotFather:
1. `/newbot` — создать бота
2. Скопировать токен
3. `/mybots` → выбрать бота → Bot Settings → Menu Button → Configure Menu Button
4. Вставить URL Mini App: `https://your-app.vercel.app/index-tg.html`

###Установка webhook (опционально):
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebAppInfo?url=https://your-app.vercel.app/index-tg.html"
```

---

## Шаг 3: Тестирование

### Способ 1: Открыть из Telegram

1. Открыть бота в Telegram
2. Нажать кнопку "Menu" (или /start)
3. Mini App откроется в WebView

### Способ 2: Прямая ссылка

```
https://t.me/<bot_username>?startapp
```

или

```
https://your-app.vercel.app/index-tg.html
```

### Проверяемые функции

| Функция | Ожидаемое поведение |
|---------|------------------|
| Открытие | Mini App загружается без ошибок |
| Telegram.WebApp | `window.Telegram` определён |
| Theme | Цвета соответствуют теме Telegram |
| Haptic | Вибрация при кликах (если поддерживается) |
| InitData | Данные пользователя передаются |

### Проверка в консоли браузера

```javascript
// Должно быть определено
console.log('Telegram:', window.Telegram)
console.log('Theme:', window.Telegram.themeParams)
console.log('User:', window.Telegram.initDataUnsafe.user)
```

---

## Шаг 4: Аутентификация

### Тест без привязки (ожидается ошибка)
1. Открыть Mini App
2. Попробовать войти — должно показать "Account not linked"

### Привязка аккаунта
1. Зайти в Todowka (браузер)
2. Настройки → "Привязать Telegram"
3. Скопировать ссылку
4. Перейти по ссылке в Telegram → подтвердить

### Тест после привязки
1. Открыть Mini App
2. Должен автоматически войти

---

## Шаг 5: Полный функционал

| Возможность | Тест |
|-----------|------|
| Создать задачу | Нажать + → ввести Title → Сохранить |
| Список задач | Проверить отображение |
| Toggle задачи | Нажать чекбокс → задача выполнена |
| Навигация | Переключение табов |
| Настр��йки | Изменить язык → проверить |

---

## Troubleshooting

### Ошибка "Failed to load"
- Проверить URL в BotFather
- Проверить CORS на хостинге

### Ошибка 401 при API
- Проверить: `window.Telegram.initData` передаётся на сервер
- Проверить endpoint `/api/telegram/login`

### Не работает Haptic
- Haptic только на мобильных устройствах
- Проверить: `window.Telegram.HapticFeedback`

---

## Деплой в production

1. Купить домен (опционально)
2. Настроить HTTPS (обычно включено в Vercel/Netlify)
3. Обновить URL в BotFather
4. Добавить в ALLOWED_ORIGINS бэкенда

---

## Конфигурация .env

### Frontend (.env)
```env
VITE_API_BASE_URL=/api
```

### Backend (.env)
```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
ALLOWED_ORIGINS=https://ваш-домен.vercel.app,https://t.me
```