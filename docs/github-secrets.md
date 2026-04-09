# GitHub Secrets для CI/CD

Для работы автоматического деплоя через GitHub Actions необходимо настроить следующие secrets в репозитории:

## Настройка Secrets

1. Перейдите в настройки репозитория: `Settings` → `Secrets and variables` → `Actions`
2. Нажмите `New repository secret` для каждого секрета ниже

## Обязательные Secrets

### SSH_PRIVATE_KEY
Закрытый SSH ключ для доступа к продакшн серверу.

**Как сгенерировать:**
```bash
ssh-keygen -t rsa -b 4096 -C "github-deploy" -f ~/.ssh/github-deploy
```

**Содержимое:**
Скопируйте содержимое файла `~/.ssh/github-deploy` (не .pub!)

**На сервере:**
Добавьте публичный ключ в `~/.ssh/authorized_keys` на продакшн сервере:
```bash
cat ~/.ssh/github-deploy.pub >> ~/.ssh/authorized_keys
```

### SERVER_HOST
IP адрес или домен продакшн сервера.

Пример: `your-server.com` или `192.168.1.100`

### SSH_USER
Имя пользователя SSH для подключения к серверу.

Пример: `root` или `ubuntu`

### DEPLOY_PATH
Полный путь к проекту на продакшн сервере.

Пример: `/var/www/todowkaapp`

### DOMAIN
Доменное имя для деплоя.

Пример: `todowka.com`

**Важно:** Убедитесь что домен указывает на IP вашего сервера через A-запись DNS.

### EMAIL
Email для Let's Encrypt сертификатов.

Пример: `admin@todowka.com`

**Важно:** Используйте реальный email для получения уведомлений о сертификатах.

## Настройка окружения GitHub

### Environment: production
1. Перейдите в `Settings` → `Environments`
2. Создайте новое окружение с названием `production`
3. Настройте protection rules если нужно

### Environment URL
В workflow файле уже настроено отображение URL:
```yaml
environment:
  name: production
  url: https://${{ secrets.DOMAIN }}
```

## Проверка конфигурации

После настройки всех secrets:

1. Проверьте SSH соединение:
```bash
ssh -i ~/.ssh/github-deploy user@server
```

2. Проверьте git доступ на сервере:
```bash
ssh user@server "cd /path/to/todowkaapp && git pull"
```

3. Тестовый деплой через GitHub Actions:
   - Перейдите в `Actions` → `Deploy to Production`
   - Нажмите `Run workflow`
   - Выберите режим деплоя (ssl или http)
   - Нажмите `Run workflow`

## Ручной запуск деплоя

Деплой можно запустить вручную:
1. Перейдите в `Actions` → `Deploy to Production`
2. Нажмите `Run workflow`
3. Выберите ветку `main`
4. Выберите режим: `ssl` или `http`
5. Нажмите `Run workflow`

## Автоматический деплой

Деплой запускается автоматически при push в ветку `main`:
```bash
git push origin main
```

## Требования к серверу

Продакшн сервер должен иметь:
- **Docker** (версия 20.10+)
- **Docker Compose** (версия 2.0+)
- **Git**
- **SSH доступ**
- **Открытые порты**: 80 (HTTP), 443 (HTTPS), 22 (SSH)

## Безопасность

- SSH ключ должен иметь restricted permissions (600)
- Не коммитьте SSH ключи или пароли в репозиторий
- Используйте отдельного пользователя для деплоя (не root)
- Настройте firewall для ограничения доступа по портам
- Используйте надежный SECRET_KEY в backend/.env