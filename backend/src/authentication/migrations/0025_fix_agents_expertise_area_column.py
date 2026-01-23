"""Generated conditional migration to ensure agents.expertise_area_id exists.

This migration is defensive: it will add the column and index only if they are
missing (using information_schema checks). The reverse removes them if present.

This helps when the Django migration state was marked applied but the physical
DDL didn't run (e.g., failed migration or partial restore).
"""

from django.db import migrations

SQL_UP = """
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
"""


SQL_DOWN = """
SET @idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'agents' AND index_name = 'agents_expertise_area_id_idx'
);
SET @stmt := IF(@idx = 1, 'DROP INDEX `agents_expertise_area_id_idx` ON `agents`', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'agents' AND column_name = 'expertise_area_id'
);
SET @stmt2 := IF(@col = 1, 'ALTER TABLE `agents` DROP COLUMN `expertise_area_id`', 'SELECT 1');
PREPARE s2 FROM @stmt2; EXECUTE s2; DEALLOCATE PREPARE s2;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0024_add_kb"),
    ]

    operations = [
        migrations.RunSQL(SQL_UP, reverse_sql=SQL_DOWN),
    ]
