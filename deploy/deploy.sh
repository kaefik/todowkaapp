#!/bin/bash
set -e

APP_DIR="/var/www/todowkaapp"
DOMAIN="todowka.nn-88-nn.ru"

echo "=== Todowka Deploy ==="

if [ ! -d "$APP_DIR" ]; then
    echo "Error: $APP_DIR not found"
    echo "Clone the repo first: git clone <repo-url> $APP_DIR"
    exit 1
fi

echo "[1/7] Backend: creating venv and installing deps..."
cd "$APP_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
venv/bin/pip install -q --upgrade pip
venv/bin/pip install -q -e .

echo "[2/7] Backend: creating .env if needed..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "WARNING: Edit $APP_DIR/backend/.env and set SECRET_KEY!"
fi

echo "[3/7] Backend: running migrations..."
mkdir -p data
venv/bin/python -m alembic upgrade head

echo "[4/7] Frontend: installing deps..."
cd "$APP_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps
fi

echo "[5/7] Frontend: creating .env if needed..."
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

echo "[6/7] Frontend: building..."
npm run build

echo "[7/7] Installing services..."

cp "$APP_DIR/deploy/todowka-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable todowka-backend

cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/$DOMAIN"
if [ ! -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    ln -s "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
fi

nginx -t

echo ""
echo "=== Deploy complete ==="
echo ""
echo "Run to start:"
echo "  systemctl start todowka-backend"
echo "  systemctl reload nginx"
echo ""
echo "Check status:"
echo "  systemctl status todowka-backend"
echo "  curl -s http://localhost:8000/health"
echo "  curl -s http://$DOMAIN/health"
