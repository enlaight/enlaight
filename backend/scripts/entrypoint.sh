#!/bin/sh
set -e

# The Dockerfile generates core/settings.py at build time, but both compose
# files bind-mount ./backend/src over /src and the mount hides it. core/
# settings.py is gitignored, so a fresh clone supplies nothing in its place
# and Django starts with no settings module at all. Regenerate it here, where
# the mount is already in effect.
#
# Only when it is missing: an existing settings.py may be a local
# customisation and must survive a restart.
[ -f core/settings.py ] || cp core/settings.sample.py core/settings.py

/scripts/wait-for-postgres.sh

python manage.py collectstatic --noinput

python manage.py migrate --noinput || true

echo "Starting server..."
exec "$@"
