#!/bin/bash

# Скрипт деплоя Todowka на продакшн сервер с SSL через хостовый nginx + certbot
# Только backend в Docker, фронтенд — статика, nginx/certbot — на хосте

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка на root
if [ "$EUID" -ne 0 ]; then
    log_warn "Скрипт должен запускаться с sudo или от root"
    log_info "Используйте: sudo ./deploy-ssl.sh"
fi

# Определение директорий
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

log_info "Директория проекта: $PROJECT_ROOT"

# Проверка наличия Docker и Docker Compose
if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose не установлен"
    exit 1
fi

# Проверка наличия nginx и certbot
if ! command -v nginx &> /dev/null; then
    log_error "nginx не установлен на хосте"
    exit 1
fi

if ! command -v certbot &> /dev/null; then
    log_error "certbot не установлен на хосте"
    log_info "Установите: sudo apt install certbot python3-certbot-nginx"
    exit 1
fi

# Создание .env из backend + frontend + docker-specific переменных
merge_env_files() {
    local env_file="$SCRIPT_DIR/.env"
    local tmp_file=$(mktemp)

    {
        echo "# ==========================================="
        echo "# Автоматически сгенерированный .env файл"
        echo "# Объединяет: backend/.env + frontend/.env + docker vars"
        echo "# ==========================================="
        echo ""

        echo "# === Backend variables ==="
        if [ -f "$PROJECT_ROOT/backend/.env" ]; then
            grep -v '^\s*#' "$PROJECT_ROOT/backend/.env" | grep -v '^\s*$' || true
        elif [ -f "$PROJECT_ROOT/backend/.env.example" ]; then
            grep -v '^\s*#' "$PROJECT_ROOT/backend/.env.example" | grep -v '^\s*$' || true
        fi
        echo ""

        echo "# === Frontend variables ==="
        if [ -f "$PROJECT_ROOT/frontend/.env" ]; then
            grep -v '^\s*#' "$PROJECT_ROOT/frontend/.env" | grep -v '^\s*$' || true
        elif [ -f "$PROJECT_ROOT/frontend/.env.example" ]; then
            grep -v '^\s*#' "$PROJECT_ROOT/frontend/.env.example" | grep -v '^\s*$' || true
        fi
        echo ""

        echo "# === Docker-specific variables ==="
        echo "DOMAIN=${DOMAIN:-todowka.nn-88-nn.ru}"
        echo "EMAIL=${EMAIL:-admin@todowka.nn-88-nn.ru}"
        echo ""
        echo "# Deploy Options"
        echo "UPDATE_CODE=${UPDATE_CODE:-true}"
        echo "BACKUP_DB=${BACKUP_DB:-true}"
        echo "CLEAN_IMAGES=${CLEAN_IMAGES:-false}"

    } > "$tmp_file"

    if [ ! -f "$env_file" ]; then
        mv "$tmp_file" "$env_file"
        log_info "Создан новый .env из backend + frontend + docker vars"
        log_warn "Проверьте настройки в $env_file"
        log_warn "Особенно SECRET_KEY и ALLOWED_ORIGINS"
        read -p "Нажмите Enter после проверки .env..."
    else
        local old_hash=$(md5sum "$env_file" | cut -d' ' -f1)
        local new_hash=$(md5sum "$tmp_file" | cut -d' ' -f1)
        if [ "$old_hash" != "$new_hash" ]; then
            cp "$env_file" "${env_file}.bak.$(date +%Y%m%d%H%M%S)"
            mv "$tmp_file" "$env_file"
            log_info ".env обновлен из исходных .env файлов (старый сохранен как .bak)"
        else
            rm "$tmp_file"
            log_info ".env актуален"
        fi
    fi
}

merge_env_files

# Параметры
UPDATE_CODE=${UPDATE_CODE:-true}
BACKUP_DB=${BACKUP_DB:-true}
CLEAN_IMAGES=${CLEAN_IMAGES:-false}

# Загрузка переменных из .env
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
fi

DOMAIN=${DOMAIN:-todowka.nn-88-nn.ru}
EMAIL=${EMAIL:-admin@todowka.nn-88-nn.ru}

log_info "Домен: $DOMAIN"
log_info "Email: $EMAIL"

# Обновление кода из git
if [ "$UPDATE_CODE" = true ]; then
    log_info "Обновление кода из git..."
    if git pull; then
        log_info "Код успешно обновлен"
    else
        log_warn "Не удалось обновить код, продолжаем с текущей версией"
    fi
fi

# Бэкап БД
if [ "$BACKUP_DB" = true ]; then
    log_info "Создание бэкапа БД..."
    BACKUP_DIR="$PROJECT_ROOT/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/todowka_$(date +%Y%m%d_%H%M%S).db"

    if docker-compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T backend cp /app/data/todowka.db /tmp/todowka_backup.db 2>/dev/null; then
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T backend cat /tmp/todowka_backup.db > "$BACKUP_FILE"
        log_info "Бэкап сохранен: $BACKUP_FILE"
    else
        log_warn "Не удалось создать бэкап, продолжаем"
    fi
fi

# Остановка контейнеров
log_info "Остановка текущих контейнеров..."
cd "$SCRIPT_DIR"
docker-compose down

# Очистка старых образов (опционально)
if [ "$CLEAN_IMAGES" = true ]; then
    log_info "Очистка старых Docker образов..."
    docker image prune -f
fi

# Сборка Docker образа (только backend)
log_info "Сборка Docker образа backend..."
docker-compose build --no-cache

# Запуск миграций БД
log_info "Запуск миграций БД..."
if docker-compose -f "$SCRIPT_DIR/docker-compose.yml" run --rm backend alembic upgrade head; then
    log_info "Миграции успешно применены"
else
    log_error "Ошибка при миграции БД"
    exit 1
fi

# Запуск контейнера backend
log_info "Запуск backend..."
docker-compose up -d

# Проверка health status backend
log_info "Проверка health status backend..."
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0
BACKEND_HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))

    if docker-compose ps | grep backend | grep -q "Up (healthy)"; then
        log_info "Backend здоров"
        BACKEND_HEALTHY=true
        break
    else
        log_warn "Backend еще не здоров (попытка $RETRY_COUNT/$MAX_RETRIES)"
    fi

    sleep 2
done

if [ "$BACKEND_HEALTHY" = true ]; then
    log_info "Backend успешно запущен"
else
    log_error "Backend не запустился корректно"
    log_info "Логи:"
    docker-compose logs --tail=50
    exit 1
fi

# Сборка фронтенда
log_info "Сборка фронтенда..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d node_modules ]; then
    npm install --legacy-peer-deps
fi
npm run build
log_info "Фронтенд собран в frontend/dist/"

# SSL сертификаты через хостовый certbot
log_info "Проверка SSL сертификатов..."

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    log_info "SSL сертификаты уже существуют"

    if openssl x509 -checkend 86400 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
        log_info "Сертификаты действительны более 24 часов"
    else
        log_warn "Сертификаты скоро истекут, обновляем..."
        certbot renew --quiet
        systemctl reload nginx
        log_info "Сертификаты обновлены"
    fi
else
    log_info "SSL сертификаты не найдены, получаем через certbot..."
    log_warn "Убедитесь что домен $DOMAIN указывает на этот сервер"
    log_warn "Убедитесь что nginx настроен и слушает порт 80 для $DOMAIN"

    certbot certonly --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN"

    if [ $? -eq 0 ]; then
        log_info "Сертификаты успешно получены"
    else
        log_error "Не удалось получить сертификаты"
        log_info "Продолжаем без SSL"
    fi
fi

# Проверка/установка конфигурации nginx для домена
NGINX_CONF_NAME="todowka"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available/$NGINX_CONF_NAME"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/$NGINX_CONF_NAME"

if [ ! -f "$NGINX_SITES_AVAILABLE" ]; then
    log_info "Создание конфигурации nginx для $DOMAIN..."

    CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
    FRONTEND_DIST="$PROJECT_ROOT/frontend/dist"

    cat > "$NGINX_SITES_AVAILABLE" << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate $CERT_PATH/fullchain.pem;
    ssl_certificate_key $CERT_PATH/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    root $FRONTEND_DIST;
    index index.html;

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF

    ln -sf "$NGINX_SITES_AVAILABLE" "$NGINX_SITES_ENABLED"
    log_info "Конфигурация nginx создана: $NGINX_SITES_AVAILABLE"
else
    log_info "Конфигурация nginx уже существует: $NGINX_SITES_AVAILABLE"
fi

# Проверка и перезагрузка nginx
log_info "Проверка конфигурации nginx..."
if nginx -t; then
    log_info "Конфигурация nginx корректна"
    systemctl reload nginx
    log_info "nginx перезагружен"
else
    log_error "Ошибка в конфигурации nginx"
    exit 1
fi

# Настройка автообновления сертификатов через cron
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    log_info "Проверка cron для автообновления сертификатов..."

    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook \"systemctl reload nginx\" >> /var/log/todowka-ssl-renew.log 2>&1") | crontab -
        log_info "Cron задача для обновления сертификатов добавлена"
    else
        log_info "Cron задача для обновления сертификатов уже существует"
    fi
fi

# Показать логи последнего запуска
log_info "Логи backend:"
cd "$SCRIPT_DIR"
docker-compose logs --tail=20

log_info "Деплой успешно завершен!"
log_info "Frontend: https://$DOMAIN (через хостовый nginx + SSL)"
log_info "Backend: http://127.0.0.1:8000 (в Docker)"
log_info "API документация: https://$DOMAIN/api/docs"
