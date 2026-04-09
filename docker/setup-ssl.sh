#!/bin/bash

# Скрипт для получения SSL сертификатов от Let's Encrypt

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Проверка переменных окружения
if [ -f .env ]; then
    source .env
fi

# Получение домена из переменных или запрос
DOMAIN=${DOMAIN:-localhost}
EMAIL=${EMAIL:-admin@localhost}

log_info "Получение SSL сертификатов для домена: $DOMAIN"
log_info "Email: $EMAIL"

# Проверка что certbot запущен
if ! docker-compose ps certbot | grep -q "Up"; then
    log_error "Certbot контейнер не запущен"
    log_info "Запустите: docker-compose up -d certbot"
    exit 1
fi

# Получение сертификата (staging для тестов)
log_info "Получение сертификата (staging режим для теста)..."
docker-compose exec certbot certbot certonly --webroot --webroot-path /var/www/certbot --email $EMAIL --agree-tos --no-eff-email --staging -d $DOMAIN --dry-run

if [ $? -eq 0 ]; then
    log_info "Тестовый запуск успешен, получаем реальные сертификаты..."
    
    # Получение реального сертификата
    docker-compose exec certbot certbot certonly --webroot --webroot-path /var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN
    
    if [ $? -eq 0 ]; then
        log_info "Сертификаты успешно получены"
        log_info "Перезапуск nginx для применения SSL..."
        docker-compose restart nginx
        log_info "SSL настроен!"
    else
        log_error "Не удалось получить сертификаты"
        exit 1
    fi
else
    log_error "Тестовый запуск не удался"
    log_info "Проверьте конфигурацию и попробуйте снова"
    exit 1
fi

# Настройка автообновления сертификатов
log_info "Настройка автообновления сертификатов..."
cat > /etc/cron.d/certbot << EOF
# Автообновление сертификатов каждое утро в 3:00
0 3 * * * root cd $SCRIPT_DIR && docker-compose exec certbot certbot renew --quiet && docker-compose restart nginx >> /var/log/certbot-renew.log 2>&1
EOF

log_info "Cron задача для автообновления настроена"
log_info "Логи: /var/log/certbot-renew.log"