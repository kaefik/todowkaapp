# CI/CD Pipeline для Todowka

Автоматический деплой приложения на продакшн сервер через GitHub Actions.

## Обзор

CI/CD pipeline выполняет следующие шаги:
1. CI проверки (linting, type checking, tests)
2. Ожидание успешного прохождения CI
3. Деплой на продакшн сервер
4. Health checks после деплоя
5. Уведомление о статусе деплоя

## Требования

### GitHub Secrets
См. `docs/github-secrets.md` для полного списка обязательных secrets.

### Требования к серверу
- Docker 20.10+
- Docker Compose 2.0+
- Git
- SSH доступ
- Порты: 80, 443, 22

## Настройка

### 1. Настройка SSH доступа

```bash
# Сгенерировать SSH ключ для GitHub Actions
ssh-keygen -t rsa -b 4096 -C "github-deploy" -f ~/.ssh/github-deploy

# Скопировать публичный ключ на сервер
ssh-copy-id -i ~/.ssh/github-deploy.pub user@your-server.com
```

### 2. Добавить SSH ключ в GitHub Secrets

Скопировать содержимое приватного ключа:
```bash
cat ~/.ssh/github-deploy
```

Добавить как secret `SSH_PRIVATE_KEY` в GitHub.

### 3. Добавить остальные Secrets

В GitHub → Settings → Secrets and variables → Actions:

- `SERVER_HOST`: IP или домен сервера
- `SSH_USER`: Пользователь SSH
- `DEPLOY_PATH`: Путь к проекту на сервере
- `DOMAIN`: Доменное имя
- `EMAIL`: Email для Let's Encrypt

### 4. Настроить окружение production

1. GitHub → Settings → Environments
2. Создать окружение `production`
3. Настроить protection rules если нужно

### 5. Инициализировать проект на сервере

```bash
# SSH на сервер
ssh user@your-server.com

# Клонировать проект
git clone https://github.com/your-username/todowkaapp.git /var/www/todowkaapp
cd /var/www/todowkaapp

# Настроить .env файл
cd docker
cp .env.example .env
nano .env  # Настроить SECRET_KEY и другие переменные

# Сделать скрипты исполняемыми
chmod +x deploy-ssl.sh deploy.sh status.sh setup-ssl.sh

# Первый деплой
./deploy-ssl.sh
```

## Использование

### Автоматический деплой

При push в ветку `main`:
```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

Деплой запустится автоматически после прохождения CI проверок.

### Ручной деплой

1. Перейти в GitHub Actions → Deploy to Production
2. Нажать "Run workflow"
3. Выбрать режим: `ssl` или `http`
4. Нажать "Run workflow"

### Локальный деплой

На продакшн сервере:
```bash
cd /var/www/todowkaapp/docker
./deploy-ssl.sh
```

## Режимы деплоя

### SSL режим (по умолчанию)
- Использует HTTPS
- Автоматически получает SSL сертификаты от Let's Encrypt
- Настраивает автообновление сертификатов
- Рекомендуется для продакшн

```bash
DEPLOY_MODE=ssl ./deploy-ssl.sh
```

### HTTP режим
- Использует только HTTP
- Без SSL сертификатов
- Для тестирования или внутреннего использования

```bash
DEPLOY_MODE=http ./deploy-ssl.sh
```

## Мониторинг

### Проверка статуса сервисов

На сервере:
```bash
cd /var/www/todowkaapp/docker
./status.sh
```

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Nginx логи
docker exec todowka-nginx tail -f /var/log/nginx/access.log
docker exec todowka-nginx tail -f /var/log/nginx/error.log
```

### Проверка SSL сертификатов

```bash
# Проверка срока действия
openssl x509 -checkend 86400 -noout -in /path/to/cert.pem

# Информация о сертификате
openssl x509 -in /path/to/cert.pem -text -noout

# Обновление сертификатов вручную
docker-compose exec certbot certbot renew
docker-compose restart nginx
```

## Резервное копирование

### Бэкап базы данных

```bash
# Автоматический бэкап перед деплоем
BACKUP_DB=true ./deploy-ssl.sh

# Ручной бэкап
cp /var/www/todowkaapp/backend/data/todowka.db /var/backups/todowka_$(date +%Y%m%d).db
```

### Восстановление из бэкапа

```bash
# Остановить сервисы
docker-compose down

# Восстановить БД
cp /var/backups/todowka_20240409.db /var/www/todowkaapp/backend/data/todowka.db

# Запустить сервисы
docker-compose up -d
```

## Откат изменений

### Откат на предыдущий коммит

```bash
# На локальной машине
git revert HEAD
git push origin main
```

GitHub Actions автоматически задеплоит откат.

### Ручной откат на сервере

```bash
cd /var/www/todowkaapp

# Откат на предыдущий коммит
git checkout HEAD~1

# Деплой
cd docker
./deploy-ssl.sh
```

## Troubleshooting

### Деплой не запускается

1. Проверьте что CI проверки прошли успешно
2. Проверьте настроены ли все required secrets
3. Проверьте логи GitHub Actions

### Ошибка SSH подключения

1. Проверьте что SSH ключ правильный
2. Проверьте что публичный ключ добавлен в authorized_keys
3. Проверьте что порт 22 открыт в firewall

### Сертификаты не получаются

1. Проверьте что домен указывает на правильный IP
2. Проверьте что порты 80 и 443 открыты и не заняты
3. Проверьте DNS настройки
4. Проверьте что DNS propagation завершился (может занять до 48 часов)

### Health checks не проходят

1. Проверьте логи сервисов: `docker-compose logs`
2. Проверьте что все контейнеры запущены: `docker-compose ps`
3. Проверьте что nginx проксирует правильно
4. Проверьте что ALLOWED_ORIGINS включает ваш домен

## Production чеклист

Перед первым деплоем:

- [ ] Настроены все GitHub Secrets
- [ ] Создано окружение production
- [ ] SSH ключ добавлен в authorized_keys
- [ ] Домен указывает на IP сервера
- [ ] Порты 80 и 443 открыты в firewall
- [ ] Настроен .env файл с надежным SECRET_KEY
- [ ] Проект клонирован на сервер
- [ ] Скрипты деплоя исполняемые
- [ ] DNS propagation завершена
- [ ] Тестовый деплой выполнен успешно

## Дополнительно

### Настройка мониторинга

Рекомендуется настроить:
- Uptime мониторинг (например, UptimeRobot)
- Логирование (например, Sentry)
- Алерты на email/Slack

### Масштабирование

Для масштабирования:
- Используйте PostgreSQL вместо SQLite
- Добавьте балансировщик нагрузки
- Настройте горизонтальное масштабирование backend
- Используйте CDN для статических файлов

### Оптимизация

- Включите gzip сжатие (уже включено в nginx)
- Настройте кэширование статических файлов
- Используйте CDN для больших файлов
- Оптимизируйте размер Docker образов