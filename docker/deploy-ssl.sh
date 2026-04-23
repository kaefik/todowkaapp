#!/bin/bash

# Скрипт деплоя Todowka на продакшн сервер с SSL
# Остановка, обновление, миграции БД, настройка SSL, запуск с проверками

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
        echo "DEPLOY_MODE=${DEPLOY_MODE:-ssl}"

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
DEPLOY_MODE=${DEPLOY_MODE:-ssl}

# Загрузка переменных из .env
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
fi

DOMAIN=${DOMAIN:-localhost}
EMAIL=${EMAIL:-admin@localhost}

log_info "Режим деплоя: $DEPLOY_MODE"
log_info "Домен: $DOMAIN"
log_info "Email: $EMAIL"

# Выбор docker-compose файла
if [ "$DEPLOY_MODE" = "ssl" ]; then
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose-ssl.yml"
else
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose-http.yml"
fi

log_info "Используется: $COMPOSE_FILE"

# Обновление кода из git
if [ "$UPDATE_CODE" = true ]; then
    log_info "Обновление кода из git..."
    if git pull; then
        log_info "Код успешно обновлен"
    else
        log_warn "Не удалось обновить код, продолжаем с текущей версией"
    fi
fi

# Создание директорий для сертификатов
mkdir -p "$SCRIPT_DIR/certbot/conf"
mkdir -p "$SCRIPT_DIR/certbot/www"

# Остановка текущих контейнеров
log_info "Остановка текущих контейнеров..."
cd "$SCRIPT_DIR"
docker-compose -f "$COMPOSE_FILE" down

# Бэкап БД
if [ "$BACKUP_DB" = true ]; then
    log_info "Создание бэкапа БД..."
    BACKUP_DIR="$PROJECT_ROOT/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/todowka_$(date +%Y%m%d_%H%M%S).db"

    if docker-compose -f "$COMPOSE_FILE" exec -T backend cp /app/data/todowka.db /tmp/todowka_backup.db 2>/dev/null; then
        docker-compose -f "$COMPOSE_FILE" exec -T backend cat /tmp/todowka_backup.db > "$BACKUP_FILE"
        log_info "Бэкап сохранен: $BACKUP_FILE"
    elif [ -d "$PROJECT_ROOT/backend/data" ] && [ -f "$PROJECT_ROOT/backend/data/todowka.db" ]; then
        cp "$PROJECT_ROOT/backend/data/todowka.db" "$BACKUP_FILE"
        log_info "Бэкап сохранен: $BACKUP_FILE"
    else
        log_warn "База данных не найдена, пропускаем бэкап"
    fi
fi

# Очистка старых образов (опционально)
if [ "$CLEAN_IMAGES" = true ]; then
    log_info "Очистка старых Docker образов..."
    docker image prune -f
fi

# Сборка Docker образов
log_info "Сборка Docker образов..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Запуск миграций БД
log_info "Запуск миграций БД..."
if docker-compose -f "$COMPOSE_FILE" run --rm backend alembic upgrade head; then
    log_info "Миграции успешно применены"
else
    log_error "Ошибка при миграции БД"
    exit 1
fi

# Запуск контейнеров
log_info "Запуск контейнеров..."
docker-compose -f "$COMPOSE_FILE" up -d

# Ожидание запуска сервисов
log_info "Ожидание запуска сервисов..."
sleep 10

# Проверка и получение SSL сертификатов
if [ "$DEPLOY_MODE" = "ssl" ]; then
    log_info "Проверка SSL сертификатов..."

    # Проверка существующих сертификатов
    if [ -f "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
        log_info "SSL сертификаты уже существуют"

        # Проверка срока действия сертификатов
        if openssl x509 -checkend 86400 -noout -in "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/fullchain.pem"; then
            log_info "Сертификаты действительны более 24 часов"
        else
            log_warn "Сертификаты скоро истекут, обновляем..."
            docker-compose -f "$COMPOSE_FILE" exec certbot certbot renew
            docker-compose -f "$COMPOSE_FILE" restart nginx
        fi
    else
        log_info "SSL сертификаты не найдены, получаем новые..."

        # Проверка на локальный домен
        if [[ "$DOMAIN" == "localhost" || "$DOMAIN" == *"localhost"* ]]; then
            log_warn "Локальный домен '$DOMAIN' - используем самоподписанные сертификаты"

            mkdir -p "$SCRIPT_DIR/certbot/conf/live/$DOMAIN"

            log_info "Генерация самоподписанных сертификатов..."
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/privkey.pem" \
                -out "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" \
                -subj "/CN=$DOMAIN/O=$DOMAIN/C=US"

            if [ $? -eq 0 ]; then
                log_info "Самоподписанные сертификаты успешно созданы"
                log_warn "Браузеры будут показывать предупреждения - это нормально для локальной разработки"
                log_info "Для доступа: https://$DOMAIN"
                log_info "В браузере нажмите 'Advanced' → 'Proceed to $DOMAIN (unsafe)'"
                docker-compose -f "$COMPOSE_FILE" restart nginx
            else
                log_error "Не удалось создать самоподписанные сертификаты"
                log_info "Продолжаем в HTTP режиме"
            fi
        else
            log_warn "Убедитесь что домен $DOMAIN указывает на этот сервер"

            log_info "Тестовый запуск получения сертификата..."
            docker-compose -f "$COMPOSE_FILE" exec certbot certbot certonly --webroot --webroot-path /var/www/certbot --email $EMAIL --agree-tos --no-eff-email --staging -d $DOMAIN --dry-run

            if [ $? -eq 0 ]; then
                log_info "Тестовый запуск успешен, получаем реальные сертификаты..."
                docker-compose -f "$COMPOSE_FILE" exec certbot certbot certonly --webroot --webroot-path /var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN

                if [ $? -eq 0 ]; then
                    log_info "Сертификаты успешно получены"
                    docker-compose -f "$COMPOSE_FILE" restart nginx
                else
                    log_error "Не удалось получить сертификаты"
                    log_info "Продолжаем в HTTP режиме"
                fi
            else
                log_error "Тестовый запуск не удался"
                log_info "Проверьте DNS настройки и попробуйте снова"
                log_info "Продолжаем в HTTP режиме"
            fi
        fi
    fi
fi

# Проверка health status
log_info "Проверка health status сервисов..."
sleep 15

MAX_RETRIES=30
RETRY_COUNT=0
ALL_HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))

    BACKEND_HEALTHY=false
    FRONTEND_HEALTHY=false
    NGINX_HEALTHY=false

    if docker-compose -f "$COMPOSE_FILE" ps | grep backend | grep -q "Up (healthy)"; then
        BACKEND_HEALTHY=true
    else
        log_warn "Backend еще не здоров (попытка $RETRY_COUNT/$MAX_RETRIES)"
    fi

    if docker-compose -f "$COMPOSE_FILE" ps | grep frontend | grep -q "Up"; then
        FRONTEND_HEALTHY=true
    else
        log_warn "Frontend еще не запущен (попытка $RETRY_COUNT/$MAX_RETRIES)"
    fi

    if docker-compose -f "$COMPOSE_FILE" ps | grep nginx | grep -q "Up"; then
        NGINX_HEALTHY=true
    else
        log_warn "Nginx еще не запущен (попытка $RETRY_COUNT/$MAX_RETRIES)"
    fi

    if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ] && [ "$NGINX_HEALTHY" = true ]; then
        ALL_HEALTHY=true
        log_info "Backend здоров"
        log_info "Frontend запущен"
        log_info "Nginx запущен"
        break
    fi

    sleep 2
done

if [ "$ALL_HEALTHY" = true ]; then
    log_info "Все сервисы успешно запущены и здоровы"
else
    log_error "Не все сервисы запустились корректно"
    log_info "Логи:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50
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

# Настройка автообновления сертификатов через cron
if [ "$DEPLOY_MODE" = "ssl" ] && [ -f "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    log_info "Настройка автообновления сертификатов..."

    CRON_JOB="0 3 * * * root cd $SCRIPT_DIR && docker-compose -f $COMPOSE_FILE exec certbot certbot renew --quiet && docker-compose -f $COMPOSE_FILE restart nginx >> /var/log/todowka-ssl-renew.log 2>&1"

    if ! grep -q "todowka-ssl-renew" /etc/cron.d/todowka-ssl 2>/dev/null; then
        echo "$CRON_JOB" | sudo tee /etc/cron.d/todowka-ssl > /dev/null
        sudo chmod 644 /etc/cron.d/todowka-ssl
        log_info "Cron задача настроена"
    else
        log_info "Cron задача уже существует"
    fi
fi

# Показать логи последнего запуска
log_info "Логи запуска:"
cd "$SCRIPT_DIR"
docker-compose -f "$COMPOSE_FILE" logs --tail=20

log_info "Деплой успешно завершен!"

if [ "$DEPLOY_MODE" = "ssl" ] && [ -f "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    log_info "Frontend доступен по HTTPS: https://$DOMAIN"
else
    log_info "Frontend доступен по HTTP: http://$DOMAIN"
fi
log_info "Backend доступен: http://$DOMAIN/api"
log_info "API документация: http://$DOMAIN/api/docs"
