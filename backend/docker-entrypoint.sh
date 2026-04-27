#!/bin/sh

set -e

if [ $# -gt 0 ]; then
    exec "$@"
fi

echo "🗄️  Running database migrations..."
alembic upgrade head

echo "🚀 Starting backend server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
