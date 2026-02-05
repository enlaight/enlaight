START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_userprofile_groups');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE authentication_userprofile_groups', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_userprofile_user_permissions');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE authentication_userprofile_user_permissions', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_projects_users');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE authentication_projects_users', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- TRUNCATE TABLE authentication_projects_agents;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_boards');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE authentication_boards', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_projects');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE authentication_projects', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_clients');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE authentication_clients', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'agents');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE agents', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'expertise_areas');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE expertise_areas', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_userprofile');
SET @stmt := IF(@tbl > 0, 'TRUNCATE TABLE authentication_userprofile', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET FOREIGN_KEY_CHECKS = 1;

-- Ensure agents.expertise_area_id exists (some deployments miss this column)
SET @col := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'agents' AND column_name = 'expertise_area_id'
);
SET @stmt := IF(@col = 0, 'ALTER TABLE `agents` ADD COLUMN `expertise_area_id` CHAR(32) NULL', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'agents' AND index_name = 'agents_expertise_area_id_idx'
);
SET @stmt2 := IF(@idx = 0, 'CREATE INDEX `agents_expertise_area_id_idx` ON `agents` (`expertise_area_id`)', 'SELECT 1');
PREPARE s2 FROM @stmt2; EXECUTE s2; DEALLOCATE PREPARE s2;


-- USERS
INSERT INTO authentication_userprofile (
    id, password, full_name, last_login, is_superuser, username, first_name, last_name,
    email, is_staff, is_active, date_joined, role, password_reset_token,
    password_reset_token_expires_at, created_at, updated_at, job_title, department, active, joined_at
)
VALUES
    (REPLACE(UUID(),'-',''),'pbkdf2_sha256$1000000$MJCt7NkTDRcmAAlQvlPBLk$e9r0S1U0BuCe2ApS5DTYqxd8SuYUI8AAy24TdMs13vc=',
    'Admin Account',NULL,TRUE,'Admin','Admin','Account','admin@localhost.ai',
    TRUE,TRUE,NOW(),'ADMINISTRATOR',NULL,NULL,NOW(),NULL,'Default Admin Account','Administration',TRUE,NOW());

-- GROUP 'Admins'
INSERT INTO auth_group (name)
SELECT 'Admins'
WHERE NOT EXISTS (SELECT 1 FROM auth_group WHERE name='Admins');

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_userprofile_groups');
SET @stmt := IF(@tbl > 0, 'INSERT INTO authentication_userprofile_groups (userprofile_id, group_id) SELECT u.id, g.id FROM authentication_userprofile u JOIN auth_group g ON g.name = \'Admins\' WHERE u.username IN (\'Admin\')', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @tbl := (SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'authentication_userprofile_user_permissions');
SET @stmt := IF(@tbl > 0, 'INSERT INTO authentication_userprofile_user_permissions (userprofile_id, permission_id) SELECT u.id, 1 FROM authentication_userprofile u WHERE u.username IN (\'Admin\')', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CLIENTS
-- include a unique hash_id to avoid duplicate '' when the column has a UNIQUE constraint
INSERT INTO authentication_clients (id, name, created_at, updated_at)
VALUES
    ('cad2388abf014e8590d03f741b5ef914', 'First Client', NOW(), NULL);

-- PROJECTS
INSERT INTO authentication_projects (id, name, client_id, created_at, updated_at)
VALUES
    ('8888581eedb84918a82d46d0e51a36ce','First Project','cad2388abf014e8590d03f741b5ef914',NOW(),NULL);

-- AGENTS
INSERT INTO agents (id, name, description, avatar, url_n8n, created_at, updated_at)
VALUES
    ('9981gg99dba8f5d76c3d4918e085103e','Data Analyst','You are Nora, the Data Analyst agent for Enlaight AI. Your role is to analyze data, identify trends, generate insights, and answer questions about metrics and performance. Use clear, data-driven reasoning and, when possible, explain findings in simple terms that non-technical users can understand. You can summarize dashboards, analyze KPIs, and assist with reports or visualizations. Maintain a confident, insightful, and collaborative tone.',NULL,'https://n8n.enlaight.ai/webhook/0f1874f7-cfbb-4c8b-8722-411b326dd9d8/chat',NOW(),NULL);

COMMIT;
