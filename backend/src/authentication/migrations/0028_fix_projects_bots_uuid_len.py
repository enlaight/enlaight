from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0027_add_project_to_invite"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                """
                ALTER TABLE `authentication_projects_bots`
                  MODIFY COLUMN `projects_id` CHAR(36) NOT NULL,
                  MODIFY COLUMN `bots_id` CHAR(36) NOT NULL;
                """
            ),
            reverse_sql=(
                """
                ALTER TABLE `authentication_projects_bots`
                  MODIFY COLUMN `projects_id` CHAR(32) NOT NULL,
                  MODIFY COLUMN `bots_id` CHAR(32) NOT NULL;
                """
            ),
        ),
    ]
