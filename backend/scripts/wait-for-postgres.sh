#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."

until pg_isready -h postgres -p 5432 -U n8n -d n8n_enlaight_db; do
    sleep 1
done

echo "PostgreSQL is ready!"
exec "$@"