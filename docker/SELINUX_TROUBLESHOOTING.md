# SELinux Troubleshooting for Todowka Deployment

## Problem

Если вы видите ошибки "Permission denied" в логах nginx или certbot контейнеров:

```
nginx: [emerg] open() "/etc/nginx/conf.d/default.conf" failed (13: Permission denied)
certbot: [Errno 13] Permission denied: '/etc/letsencrypt/.certbot.lock'
```

Это вызвано SELinux, который блокирует доступ Docker контейнерам к файлам системы.

## Solutions

### Solution 1: Disable SELinux temporarily (for testing)

```bash
# Отключить SELinux временно
sudo setenforce 0

# Проверить статус (должен быть Permissive)
getenforce
```

После отключения попробуйте снова:
```bash
cd /path/to/todowkaapp/docker
./deploy-ssl.sh
```

### Solution 2: Configure SELinux context for Docker volumes

Добавьте `:z` к volume paths в docker-compose файлах:

```yaml
volumes:
  - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf:z
  - ./certbot/conf:/etc/letsencrypt:z
  - ./certbot/www:/var/www/certbot:z
```

`:z` автоматически настраивает правильный SELinux контекст для shared volumes.

### Solution 3: Use manual SELinux labeling

```bash
# Установить контекст SELinux для файлов
sudo chcon -R -t svirt_sandbox_file_t docker/nginx-ssl.conf
sudo chcon -R -t svirt_sandbox_file_t docker/nginx-http.conf
sudo chcon -R -t svirt_sandbox_file_t docker/certbot/
```

### Solution 4: Disable SELinux permanently (not recommended for production)

```bash
# Редактировать конфиг SELinux
sudo nano /etc/selinux/config

# Изменить SELINUX=enforcing на:
SELINUX=permissive

# Перезагрузить систему
sudo reboot
```

## Recommended approach

Для продакшн:
1. **Решение 2** - добавить `:z` к volume paths (безопасно)
2. **Решение 3** - ручная настройка контекстов (для сложных случаев)

Для тестирования/разработки:
1. **Решение 1** - временное отключение SELinux

## Verification

После применения решения проверьте:

```bash
# Проверить SELinux статус
getenforce

# Проверить контексты файлов
ls -laZ docker/nginx-ssl.conf
ls -laZ docker/certbot/

# Запустить деплой
cd /path/to/todowkaapp/docker
./deploy-ssl.sh
```

## Common SELinux commands

```bash
# Проверить статус SELinux
getenforce
sestatus

# Временно переключить режим
sudo setenforce 0  # Disabled
sudo setenforce 1  # Enforcing

# Проверить контексты файлов
ls -laZ /path/to/files

# Изменить контекст файла
sudo chcon -t svirt_sandbox_file_t /path/to/file

# Изменить контекст рекурсивно
sudo chcon -R -t svirt_sandbox_file_t /path/to/directory

# Сохранить изменения контекстов
sudo semanage fcontext -a -t svirt_sandbox_file_t "/path/to/directory(/.*)?"
sudo restorecon -R -v /path/to/directory
```

## Additional resources

- [SELinux and Docker](https://docs.docker.com/engine/security/selinux/)
- [SELinux troubleshooting](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux)