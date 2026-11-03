#!/bin/sh
# Create the n8n role and database on first initialisation.
#
# This runs only once, on an empty data directory. The password therefore
# comes from the environment rather than a literal: hardcoding it meant
# env.sample could promise one value while the role was created with another,
# and n8n then failed to authenticate against the database this script had
# just created for it.
#
# Changing N8N_DB_PASSWORD later does NOT reach an existing role. On a volume
# that already exists, change it with:
#   ALTER ROLE n8n WITH PASSWORD '<new>';
set -e

: "${N8N_DB_PASSWORD:?N8N_DB_PASSWORD must be set so the n8n role and the n8n service agree on one password}"

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v n8n_password="$N8N_DB_PASSWORD" <<'EOSQL'
-- Create the n8n role if it doesn't already exist. format(%L) quotes and
-- escapes the password, so a value containing a quote cannot break the
-- statement. The variable is interpolated by psql before the server sees it,
-- which is why this is not wrapped in a DO $$ ... $$ block: psql does not
-- substitute variables inside dollar-quoted strings.
SELECT format('CREATE ROLE n8n WITH LOGIN PASSWORD %L', :'n8n_password')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n')\gexec

-- Create the n8n database if it doesn't already exist
SELECT 'CREATE DATABASE n8n_enlaight_db OWNER n8n ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n_enlaight_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE n8n_enlaight_db TO n8n;
EOSQL
