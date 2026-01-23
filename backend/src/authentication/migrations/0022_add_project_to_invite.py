from django.db import migrations


class Migration(migrations.Migration):
    """
    Placeholder no-op migration retained for historical reasons.
    The actual addition of the `project` FK is handled in migration 0027_add_project_to_invite.py.
    To avoid migration graph conflicts this migration now depends on the latest
    authentication migration and performs no operations.
    """

    dependencies = [("authentication", "0026_add_client_id_boards")]

    operations = []
