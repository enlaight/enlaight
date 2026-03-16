from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0027_add_project_to_invite"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                """
                    ALTER TABLE authentication_projects_bots
                    ALTER COLUMN projects_id TYPE UUID USING projects_id::uuid,
                    ALTER COLUMN bots_id TYPE UUID USING bots_id::uuid;
                """
            ),
            reverse_sql=(
                """
                    ALTER TABLE authentication_projects_bots
                    ALTER COLUMN projects_id TYPE CHAR(32) USING REPLACE(projects_id::text, '-', ''),
                    ALTER COLUMN bots_id TYPE CHAR(32) USING REPLACE(bots_id::text, '-', '');
                """
            ),
        ),
    ]
