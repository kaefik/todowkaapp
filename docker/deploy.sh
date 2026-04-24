#!/bin/bash

# Скрипт деплоя Todowka на продакшн сервер
# Остановка, обновление, миграции БД, запуск с проверками

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Логирование
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
    log_info "Используйте: sudo ./deploy.sh"
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

# Сборка Docker образов (backend)
log_info "Сборка Docker образов..."
docker-compose build --no-cache

# Запуск миграций БД
log_info "Запуск миграций БД..."
if docker-compose -f "$SCRIPT_DIR/docker-compose.yml" run --rm backend alembic upgrade head; then
    log_info "Миграции успешно применены"
else
    log_error "Ошибка при миграции БД"
    exit 1
fi

# Запуск контейнеров
log_info "Запуск контейнеров..."
docker-compose up -d

# Проверка health status
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
npm install --legacy-peer-deps
npm run build
log_info "Фронтенд собран в frontend/dist/"

# Показать логи последнего запуска
log_info "Логи запуска:"
cd "$SCRIPT_DIR"
docker-compose logs --tail=20

log_info "Деплой успешно завершен!"
log_info "Frontend: http://todowka.nn-88-nn.ru (через хостовый nginx)"
log_info "Backend: http://localhost:8000 (в Docker)"
log_info "API документация: http://todowka.nn-88-nn.ru/api/docs"