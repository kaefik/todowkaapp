#!/usr/bin/env bash
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

run_check() {
    local name="$1"
    local cmd="$2"
    local dir="$3"

    echo -e "${YELLOW}▶ $name${NC}"
    if (cd "$dir" && eval "$cmd") > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ OK${NC}"
        ((PASS++))
    else
        echo -e "  ${RED}✗ FAIL${NC}"
        echo -e "  ${YELLOW}Подробнее:${NC}"
        (cd "$dir" && eval "$cmd") 2>&1 | sed 's/^/    /'
        ((FAIL++))
    fi
    echo
}

echo "======================================"
echo "  Проверка Backend — Todowka"
echo "======================================"
echo

run_check "Ruff (линтер)" "ruff check ." "./backend"
run_check "Pytest (тесты)" "source venv/bin/activate && python -m pytest tests/ -v" "./backend"

echo "======================================"
echo -e "  ${GREEN}Пройдено: $PASS${NC}  ${RED}Провалено: $FAIL${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
