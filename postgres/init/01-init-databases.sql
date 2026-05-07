-- Create user (role)
CREATE ROLE n8n WITH LOGIN PASSWORD 'n8n_dev_password';

-- Create database owned by that user
CREATE DATABASE n8n_enlaight_db
    OWNER n8n
    ENCODING 'UTF8';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE n8n_enlaight_db TO n8n;