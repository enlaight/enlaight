"""Generated conditional migration to ensure agents.expertise_area_id exists.

This migration is defensive: it will add the column and index only if they are
missing (using information_schema checks). The reverse removes them if present.

This helps when the Django migration state was marked applied but the physical
DDL didn't run (e.g., failed migration or partial restore).
"""

from django.db import migrations

SQL_UP = """
    ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS expertise_area_id UUID;

    ALTER TABLE agents
    ADD CONSTRAINT fk_agents_expertise_area
    FOREIGN KEY (expertise_area_id)
    REFERENCES expertise_areas(id)
    ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS agents_expertise_area_id_idx
    ON agents (expertise_area_id);
"""

SQL_DOWN = """
    DROP INDEX IF EXISTS agents_expertise_area_id_idx;

    ALTER TABLE agents
    DROP CONSTRAINT IF EXISTS fk_agents_expertise_area;

    ALTER TABLE agents
    DROP COLUMN IF EXISTS expertise_area_id;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0024_add_kb"),
    ]

    operations = [
        migrations.RunSQL(SQL_UP, reverse_sql=SQL_DOWN),
    ]
