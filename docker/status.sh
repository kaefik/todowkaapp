#!/bin/bash

# Скрипт проверки статуса сервисов

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

log_info "Проверка статуса сервисов Todowka..."
echo ""

# Проверка запущенных контейнеров
log_info "Статус контейнеров:"
docker-compose ps
echo ""

# Проверка health status
log_info "Health статус:"
if docker-compose ps | grep backend | grep -q "Up (healthy)"; then
    log_info "Backend: здоров"
else
    log_error "Backend: не здоров"
fi

if docker-compose ps | grep frontend | grep -q "Up"; then
    log_info "Frontend: запущен"
else
    log_error "Frontend: не запущен"
fi
echo ""

# Проверка подключения к API
log_info "Проверка подключения к API..."
if curl -sf http://localhost/api/health > /dev/null; then
    log_info "Backend API: доступен"
else
    log_warn "Backend API: недоступен"
fi
echo ""

# Проверка фронтенда
log_info "Проверка фронтенда..."
if curl -sf http://localhost > /dev/null; then
    log_info "Frontend: доступен"
else
    log_warn "Frontend: недоступен"
fi
echo ""

# Проверка использования ресурсов
log_info "Использование ресурсов:"
docker stats --no-stream $(docker-compose ps -q)