#!/bin/bash
# Backend startup script
# Runs database migrations before starting the server

set -e

echo "🔍 Debug: Checking environment variables..."
echo "DATABASE_URL is set: $(if [ -n "$DATABASE_URL" ]; then echo 'YES'; else echo 'NO'; fi)"
echo "DATABASE_URL starts with: $(echo $DATABASE_URL | cut -c1-30)..."
echo "REDIS_URL is set: $(if [ -n "$REDIS_URL" ]; then echo 'YES'; else echo 'NO'; fi)"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set! Please set it in Railway variables."
    echo "🚀 Starting server anyway (will use default localhost)..."
else
    echo "🔄 Running database migrations..."
    alembic upgrade head || echo "⚠️ Migration failed or already up to date"

    echo "🌱 Seeding mechanics library..."
    python -m app.db.seed || echo "⚠️ Seeding failed or already seeded"
fi

echo "🚀 Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
