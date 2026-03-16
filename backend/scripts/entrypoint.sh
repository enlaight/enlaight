#!/bin/sh
set -e

/scripts/wait-for-postgres.sh

python manage.py collectstatic --noinput

python manage.py migrate --noinput || true

echo "Starting server..."
exec "$@"
