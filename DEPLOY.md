# Deploy Instructions

Быстрый старт для развертывания Todowka на продакшн сервере.

## Автоматический деплой через GitHub Actions

### Шаг 1: Настройка SSH доступа

```bash
# Генерация SSH ключа
ssh-keygen -t rsa -b 4096 -C "github-deploy" -f ~/.ssh/github-deploy

# Копирование публичного ключа на сервер
ssh-copy-id -i ~/.ssh/github-deploy.pub user@your-server.com
```

### Шаг 2: Настройка GitHub Secrets

В GitHub: Settings → Secrets and variables → Actions

Добавьте следующие secrets:
- `SSH_PRIVATE_KEY`: содержимое файла `~/.ssh/github-deploy`
- `SERVER_HOST`: IP или домен сервера
- `SSH_USER`: пользователь SSH
- `DEPLOY_PATH`: `/var/www/todowkaapp`
- `DOMAIN`: `your-domain.com`
- `EMAIL`: `admin@your-domain.com`

### Шаг 3: Инициализация сервера

```bash
# SSH на сервер
ssh user@your-server.com

# Клонирование проекта
git clone https://github.com/your-username/todowkaapp.git /var/www/todowkaapp
cd /var/www/todowkaapp/docker

# Настройка окружения
cp .env.example .env
nano .env  # настроить SECRET_KEY!

# Первый деплой
chmod +x deploy-ssl.sh
./deploy-ssl.sh
```

### Шаг 4: Деплой

Автоматический (при push в main):
```bash
git push origin main
```

Ручной (через GitHub Actions):
- Перейдите в Actions → Deploy to Production
- Нажмите "Run workflow"

## Локальный деплой на сервере

```bash
ssh user@your-server.com
cd /var/www/todowkaapp/docker
./deploy-ssl.sh
```

## Устранение неполадок

### Ошибка: Backend не запускается, логи показывают `no such table: users`

**Проблема:** Таблицы базы данных не созданы, миграции Alembic не применены.

**Решение:**

```bash
# 1. Проверьте содержимое backend/alembic.ini
# Путь к базе данных должен быть: sqlite+aiosqlite:////app/data/todowka.db

# 2. Если путь неверный, исправьте его:
cd /var/www/todowkaapp
nano backend/alembic.ini
# Измените строку sqlalchemy.url на:
# sqlalchemy.url = sqlite+aiosqlite:////app/data/todowka.db

# 3. Пересоберите и перезапустите контейнеры
cd docker
./deploy-ssl.sh
```

**Причина:** В Docker контейнере путь к базе данных должен указывать на `/app/data/`, а не на путь хостовой системы.

## Документация

Подробная документация:
- **GitHub Secrets**: `docs/github-secrets.md`
- **Полный CI/CD гайд**: `docs/ci-cd.md`
- **README**: `README.md` (раздел Deployment)