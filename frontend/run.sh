#!/bin/bash

set -e

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$FRONTEND_DIR"

echo "🚀 Starting Todowka Frontend..."

NODE_MODULES="node_modules"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ ! -d "$NODE_MODULES" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
else
    echo "📦 Dependencies found. Checking for updates..."
    npm install --legacy-peer-deps
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "📄 Creating $ENV_FILE from $ENV_EXAMPLE..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "⚠️  Please update $ENV_FILE with your configuration before starting in production!"
fi

echo "✅ Starting development server on http://localhost:5173..."
npm run dev
