-- Backend database
CREATE DATABASE IF NOT EXISTS enlaight_database
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Superset metadata database
CREATE DATABASE IF NOT EXISTS superset_database
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Users
CREATE USER IF NOT EXISTS 'enlaight'@'%' IDENTIFIED BY 'enlaight';
CREATE USER IF NOT EXISTS 'superset'@'%' IDENTIFIED BY 'superset';

-- Permissions
GRANT ALL PRIVILEGES ON enlaight_database.* TO 'enlaight'@'%';
GRANT ALL PRIVILEGES ON superset_database.* TO 'superset'@'%';

FLUSH PRIVILEGES;
