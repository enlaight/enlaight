-- Create n8n role if it doesn't already exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n') THEN
      CREATE ROLE n8n WITH LOGIN PASSWORD 'n8n_dev_password';
   END IF;
END
$$;

-- Create the n8n database if it doesn't already exist
SELECT 'CREATE DATABASE n8n_enlaight_db OWNER n8n ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n_enlaight_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE n8n_enlaight_db TO n8n;
