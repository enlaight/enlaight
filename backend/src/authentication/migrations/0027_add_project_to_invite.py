import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0022_add_project_to_invite"),
    ]

    operations = [
        migrations.AddField(
            model_name="invite",
            name="project",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="invites",
                to="authentication.projects",
            ),
        ),
    ]
