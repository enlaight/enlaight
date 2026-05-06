#!/bin/sh
set -e

HOST="${POSTGRES_HOST:-postgres}"
PORT="${POSTGRES_PORT:-5432}"
USER="${BACKEND_DB_USER:-enlaight}"
DB="${BACKEND_DB:-enlaight_database}"

echo "Waiting for PostgreSQL at $HOST:$PORT..."

until pg_isready -h "$HOST" -p "$PORT" -U "$USER" -d "$DB"; do
    sleep 1
done

echo "PostgreSQL is ready!"
exec "$@"