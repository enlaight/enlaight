#!/bin/sh
set -e
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py seed_admin || true
exec python manage.py runserver 0.0.0.0:8000
