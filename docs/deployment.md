# Развертывание Todowka на сервере

## Требования

- Ubuntu 22.04+ (или другой Linux)
- 1 GB RAM, 1 vCPU минимум
- Публичный IP-адрес
- Домен (опционально)

---

## Вариант A: Docker (рекомендуемый)

### Требования

- Docker + Docker Compose
- git

### Установка Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### Первый запуск

```bash
# 1. Клонировать репозиторий
git clone <repo-url> /var/www/todowkaapp
cd /var/www/todowkaapp

# 2. Настроить backend/.env
cp backend/.env.example backend/.env
nano backend/.env
# Обязательно изменить:
#   SECRET_KEY=<сгенерировать случайную строку 64 символа>
#   ALLOWED_ORIGINS=http://ваш-домен.ru,https://ваш-домен.ru
#   APP_ENV=production
#   MAX_USERS=2  (или убрать для безлимита)

# 3. Настроить frontend/.env
cp frontend/.env.example frontend/.env
nano frontend/.env
# Для production оставить:
#   VITE_API_BASE_URL=/api

# 4. Запустить деплой
sudo bash docker/deploy.sh
```

При первом запуске скрипт автоматически:
- Объединит переменные из `backend/.env` + `frontend/.env` + docker vars в `docker/.env`
- Соберёт Docker-образы (backend + frontend)
- Применит миграции БД
- Запустит контейнеры
- Проверит health-check

### Обновление

```bash
cd /var/www/todowkaapp
sudo bash docker/deploy.sh
```

Скрипт выполнит: `git pull` → бэкап БД → пересборка образов → миграции → перезапуск.

### Управление

```bash
# Статус контейнеров
docker ps

# Логи
docker logs -f todowka-backend
docker logs -f todowka-frontend

# Перезапуск
cd /var/www/todowkaapp/docker
docker-compose restart backend
docker-compose restart frontend

# Остановка
cd /var/www/todowkaapp/docker
docker-compose down

# Бэкап БД вручную
docker cp todowka-backend:/app/data/todowka.db ./backup_$(date +%Y%m%d).db

# Восстановление БД
docker cp ./backup.db todowka-backend:/app/data/todowka.db
docker-compose restart backend
```

### Где хранятся данные

| Что | Где |
|-----|-----|
| БД (SQLite) | Docker volume `docker_backend-data` → `/app/data/todowka.db` |
| Логи backend | `docker logs todowka-backend` |
| Логи frontend | `docker logs todowka-frontend` |
| Конфиг | `docker/.env` (автогенерируется) |

### Структура контейнеров

```
todowka-backend  → порт 8000 (FastAPI + uvicorn)
todowka-frontend → порт 80   (nginx + React static)
```

Frontend-контейнер раздает статику React и проксирует `/api/*` на backend.

---

## Вариант B: Нативный деплой (без Docker)

### Требования

- Python 3.12+
- Node.js 20+
- nginx
- systemd

### Установка зависимостей

```bash
apt update
apt install -y python3 python3-venv python3-pip nodejs npm nginx
```

### Первый запуск

```bash
# 1. Клонировать репозиторий
git clone <repo-url> /var/www/todowkaapp

# 2. Запустить скрипт деплоя
sudo bash /var/www/todowkaapp/deploy/deploy.sh
```

Скрипт автоматически:
- Создаст Python venv и установит зависимости backend
- Создаст `backend/.env` из `.env.example` (если нет)
- Применит миграции БД
- Установит зависимости frontend и соберёт production-билд
- Установит systemd-сервис и nginx-конфиг

### Настройка после первого запуска

```bash
# 1. Настроить backend/.env
nano /var/www/todowkaapp/backend/.env
# Обязательно изменить:
#   SECRET_KEY=<сгенерировать случайную строку>
#   ALLOWED_ORIGINS=http://ваш-домен.ru
#   APP_ENV=production

# 2. Проверить nginx-конфиг (домен)
nano /etc/nginx/sites-available/todowka.nn-88-nn.ru

# 3. Запустить сервисы
systemctl start todowka-backend
systemctl reload nginx
systemctl enable todowka-backend
```

### Обновление

```bash
cd /var/www/todowkaapp
git pull
sudo bash deploy/deploy.sh
sudo systemctl restart todowka-backend
sudo systemctl reload nginx
```

### Управление

```bash
# Статус
systemctl status todowka-backend

# Логи
journalctl -u todowka-backend -f

# Перезапуск
systemctl restart todowka-backend

# Проверить nginx
nginx -t
systemctl reload nginx
```

### Где хранятся данные

| Что | Где |
|-----|-----|
| БД (SQLite) | `/var/www/todowkaapp/backend/data/todowka.db` |
| Frontend (static) | `/var/www/todowkaapp/frontend/dist/` |
| Конфиг backend | `/var/www/todowkaapp/backend/.env` |
| systemd сервис | `/etc/systemd/system/todowka-backend.service` |
| nginx конфиг | `/etc/nginx/sites-available/todowka.nn-88-nn.ru` |

---

## SSL (HTTPS) с Docker

Для подключения HTTPS через Let's Encrypt:

```bash
# 1. Убедиться что домен указывает на IP сервера
dig +short ваш-домен.ru

# 2. Настроить переменные в docker/.env
DOMAIN=ваш-домен.ru
EMAIL=ваша@почта.com

# 3. Запустить SSL-деплой
sudo bash docker/deploy-ssl.sh
```

Скрипт автоматически получит SSL-сертификат через Let's Encrypt и настроит автообновление через cron.

---

## Решение проблем

### Сайт недоступен снаружи

```bash
# Проверить IP сервера
curl -s ifconfig.me

# Проверить что DNS указывает на этот IP
dig +short ваш-домен.ru

# Проверить фаервол
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Backend не запускается

```bash
# Docker
docker logs todowka-backend --tail=50

# Нативный
journalctl -u todowka-backend --no-pager -n 50
```

### Ошибка миграций

```bash
# Docker
docker-compose -f docker/docker-compose.yml run --rm backend alembic upgrade head

# Нативный
cd /var/www/todowkaapp/backend
venv/bin/python -m alembic upgrade head
```
