#!/bin/bash

set -e

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

VENV_DIR="venv"
PYTHON_CMD="$VENV_DIR/bin/python"

if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

echo "📦 Installing/updating dependencies..."
"$PYTHON_CMD" -m pip install --upgrade pip
"$PYTHON_CMD" -m pip install -e .

echo "🚀 Starting Todowka Backend..."

DATA_DIR="data"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ ! -d "$DATA_DIR" ]; then
    echo "📁 Creating $DATA_DIR directory..."
    mkdir -p "$DATA_DIR"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "📄 Creating $ENV_FILE from $ENV_EXAMPLE..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "⚠️  Please update $ENV_FILE with your configuration before starting in production!"
fi

DB_PATH="${DATA_DIR}/todowka.db"

if [ ! -f "$DB_PATH" ]; then
    echo "🗄️  Database not found. Running migrations..."
    "$PYTHON_CMD" -m alembic upgrade head
else
    echo "🗄️  Database found. Checking for pending migrations..."
    "$PYTHON_CMD" -m alembic upgrade head
fi

echo "✅ Starting server on http://localhost:8000..."
"$PYTHON_CMD" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
