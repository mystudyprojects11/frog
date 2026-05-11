#!/bin/sh
set -e

echo "Running migrations..."
alembic upgrade head

echo "Starting server (APP_ENV=${APP_ENV:-development})..."
if [ "${APP_ENV}" = "production" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips='*'
else
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
