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

# Проверка .env файла
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    log_warn "Файл .env не найден, создаем из .env.example"
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        log_info ".env создан. Пожалуйста, настройте его для продакшн"
        log_info "Особенно SECRET_KEY и ALLOWED_ORIGINS"
        read -p "Нажмите Enter после настройки .env..."
    else
        log_error "Файл .env.example не найден"
        exit 1
    fi
fi

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

# Сборка новых образов
log_info "Сборка Docker образов..."
docker-compose build --no-cache

# Запуск миграций БД
log_info "Запуск миграций БД..."
cd "$PROJECT_ROOT/backend"
if docker-compose -f "$SCRIPT_DIR/docker-compose.yml" run --rm backend alembic upgrade head; then
    log_info "Миграции успешно применены"
else
    log_error "Ошибка при миграции БД"
    exit 1
fi

# Запуск контейнеров
log_info "Запуск контейнеров..."
cd "$SCRIPT_DIR"
docker-compose up -d

# Проверка health status
log_info "Проверка health status сервисов..."
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0
ALL_HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    # Проверка бекенда
    if docker-compose ps | grep backend | grep -q "Up (healthy)"; then
        log_info "Backend здоров"
        BACKEND_HEALTHY=true
    else
        log_warn "Backend еще не здоров (попытка $RETRY_COUNT/$MAX_RETRIES)"
        BACKEND_HEALTHY=false
    fi
    
    # Проверка фронтенда
    if docker-compose ps | grep frontend | grep -q "Up"; then
        log_info "Frontend запущен"
        FRONTEND_HEALTHY=true
    else
        log_warn "Frontend еще не запущен (попытка $RETRY_COUNT/$MAX_RETRIES)"
        FRONTEND_HEALTHY=false
    fi
    
    if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
        ALL_HEALTHY=true
        break
    fi
    
    sleep 2
done

if [ "$ALL_HEALTHY" = true ]; then
    log_info "Все сервисы успешно запущены и здоровы"
else
    log_error "Не все сервисы запустились корректно"
    log_info "Логи:"
    docker-compose logs --tail=50
    exit 1
fi

# Показать логи последнего запуска
log_info "Логи запуска:"
docker-compose logs --tail=20

log_info "Деплой успешно завершен!"
log_info "Frontend доступен на порту 80"
log_info "Backend доступен на порту 8000"
log_info "API документация: http://localhost/api/docs"