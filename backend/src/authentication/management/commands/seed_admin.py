from django.core.management.base import BaseCommand
from django.db import connection, transaction
import os


class Command(BaseCommand):
    help = "Execute SQL seed file that creates admin user/group and other initial data."

    def handle(self, *args, **options):
        path = "/sql-init/set_admin.sql"
        if not os.path.exists(path):
            self.stdout.write(self.style.WARNING(f"Seed SQL not found at {path}, skipping."))
            return

        with open(path, "r") as f:
            sql = f.read()

        # remove SQL comments lines that start with -- and blank lines
        lines = []
        for line in sql.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("--"):
                continue
            lines.append(line)

        sql_clean = "\n".join(lines)

        # naive split by semicolon; execute statements sequentially
        statements = [s.strip() for s in sql_clean.split(";") if s.strip()]

        with transaction.atomic():
            with connection.cursor() as cursor:
                for stmt in statements:
                    try:
                        cursor.execute(stmt)
                    except Exception as e:
                        self.stderr.write(f"Failed to execute statement (truncated): {stmt[:200]}...\nError: {e}")

        self.stdout.write(self.style.SUCCESS("Seed SQL executed (if present)."))
