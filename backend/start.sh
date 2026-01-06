#!/bin/bash
# Backend startup script
# Runs database migrations before starting the server

set -e

echo "🔄 Running database migrations..."
alembic upgrade head || echo "⚠️ Migration failed or already up to date"

echo "🌱 Seeding mechanics library..."
python -m app.db.seed || echo "⚠️ Seeding failed or already seeded"

echo "🚀 Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
