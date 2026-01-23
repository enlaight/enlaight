START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE authentication_userprofile_groups;
TRUNCATE TABLE authentication_userprofile_user_permissions;
TRUNCATE TABLE authentication_projects_users;
-- TRUNCATE TABLE authentication_projects_agents;
TRUNCATE TABLE authentication_boards;
TRUNCATE TABLE authentication_projects;
TRUNCATE TABLE authentication_clients;
TRUNCATE TABLE agents;
TRUNCATE TABLE expertise_areas;
TRUNCATE TABLE authentication_userprofile;

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

-- USER <-> GROUP
INSERT INTO authentication_userprofile_groups (userprofile_id, group_id)
SELECT u.id, g.id
FROM authentication_userprofile u
JOIN auth_group g ON g.name = 'Admins'
WHERE u.username IN ('Admin');

-- USER PERMISSIONS
INSERT INTO authentication_userprofile_user_permissions (userprofile_id, permission_id)
SELECT u.id, 1
FROM authentication_userprofile u
WHERE u.username IN ('Admin');

COMMIT;
