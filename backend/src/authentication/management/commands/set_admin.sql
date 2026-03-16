BEGIN;

-- Truncate tables safely (CASCADE handles FK dependencies)
-- Truncate tables individually, ignoring errors if they don't exist
TRUNCATE TABLE authentication_userprofile_groups RESTART IDENTITY CASCADE;
TRUNCATE TABLE authentication_userprofile_user_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE authentication_projects_users RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE authentication_projects_agents RESTART IDENTITY CASCADE;
TRUNCATE TABLE authentication_boards RESTART IDENTITY CASCADE;
TRUNCATE TABLE authentication_projects RESTART IDENTITY CASCADE;
TRUNCATE TABLE authentication_clients RESTART IDENTITY CASCADE;
TRUNCATE TABLE agents RESTART IDENTITY CASCADE;
TRUNCATE TABLE expertise_areas RESTART IDENTITY CASCADE;
TRUNCATE TABLE authentication_userprofile RESTART IDENTITY CASCADE;

-- Ensure agents.expertise_area_id exists
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS expertise_area_id uuid;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS agents_expertise_area_id_idx
ON agents (expertise_area_id);


-- USERS
INSERT INTO authentication_userprofile (
    id, password, full_name, last_login, is_superuser, username, first_name, last_name,
    email, is_staff, is_active, date_joined, role, password_reset_token,
    password_reset_token_expires_at, created_at, updated_at, job_title, department, active, joined_at
)
VALUES (
    'a3c2f5d8-1e6a-4b3f-9a8c-2d5b6f7c8e9f':: uuid,
    'pbkdf2_sha256$1000000$MTbgh4oFBsrlHEfkgCgnAj$2MLQejok/pG3Dohq7rVWmkAXYVoajJE/3wjd2JNEFGY=',
    'Admin Account',
    NULL,
    TRUE,
    'Admin',
    'Admin',
    'Account',
    'admin@localhost.ai',
    TRUE,
    TRUE,
    NOW(),
    'ADMINISTRATOR',
    NULL,
    NULL,
    NOW(),
    NULL,
    'Default Admin Account',
    'Administration',
    TRUE,
    NOW()
)
ON CONFLICT DO NOTHING;


-- GROUP 'Admins'
INSERT INTO auth_group (name)
VALUES ('Admins')
ON CONFLICT (name) DO NOTHING;


-- USER → GROUP relation
INSERT INTO authentication_userprofile_groups (userprofile_id, group_id)
SELECT u.id, g.id
FROM authentication_userprofile u
JOIN auth_group g ON g.name = 'Admins'
WHERE u.username = 'Admin'
AND to_regclass('authentication_userprofile_groups') IS NOT NULL;


-- USER PERMISSIONS
INSERT INTO authentication_userprofile_user_permissions (userprofile_id, permission_id)
SELECT u.id, 1
FROM authentication_userprofile u
WHERE u.username = 'Admin'
AND to_regclass('authentication_userprofile_user_permissions') IS NOT NULL;


-- -- CLIENTS
-- INSERT INTO authentication_clients (id, name, created_at, updated_at)
-- VALUES
--     ('a3c2f5d8-1e6a-4b3f-9a8c-2d5b6f7c8e9f'::uuid, 'First Client', NOW(), NULL)
-- ON CONFLICT DO NOTHING;


-- -- PROJECTS
-- INSERT INTO authentication_projects (id, name, client_id, created_at, updated_at)
-- SELECT
--     'a3c2f5d8-1e6a-4b3f-9a8c-2d5b6f7c8e9f'::uuid,
--     'First Project',
--     'a3c2f5d8-1e6a-4b3f-9a8c-2d5b6f7c8e9f'::uuid,
--     NOW(),
--     NULL
-- FROM authentication_clients c
-- WHERE c.name = 'First Client'
-- LIMIT 1;


-- -- AGENTS
-- INSERT INTO agents (id, name, description, avatar, url_n8n, created_at, updated_at)
-- VALUES (
--     'a3c2f5d8-1e6a-4b3f-9a8c-2d5b6f7c8e9f'::uuid,
--     'Data Analyst',
--     'You are Nora, the Data Analyst agent for Enlaight AI. Your role is to analyze data, identify trends, generate insights, and answer questions about metrics and performance. Use clear, data-driven reasoning and, when possible, explain findings in simple terms that non-technical users can understand. You can summarize dashboards, analyze KPIs, and assist with reports or visualizations. Maintain a confident, insightful, and collaborative tone',
--     NULL,
--     'https://n8n.enlaight.ai/webhook/0f1874f7-cfbb-4c8b-8722-411b326dd9d8/chat',
--     NOW(),
--     NULL
-- )
-- ON CONFLICT DO NOTHING;

COMMIT;