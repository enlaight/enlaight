# Use the latest stable Apache Superset lean image
FROM apache/superset:latest

# Switch to root to install packages
USER root

# Set environment variable for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/local/share/playwright-browsers

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Dependencies for MySQL
RUN apt-get update && apt-get install -y \
    libssl-dev \
    libffi-dev \
    python3-dev \
    gcc \
    curl \
    unzip

# Install production dependencies
# Using uv pip install as recommended for Superset 4.1+
RUN . /app/.venv/bin/activate && \
    uv pip install \
    # PostgreSQL driver for metadata store
    psycopg2-binary \
    # Common database drivers for analytics databases
    pymssql \
    # Authentication packages
    Authlib \
    # File handling
    openpyxl \
    # Image processing for Alerts & Reports
    Pillow \
    # MySQL client for dbs
    mysqlclient \
    # Playwright for screenshots and PDF generation
    playwright \
    && playwright install-deps \
    && PLAYWRIGHT_BROWSERS_PATH=/usr/local/share/playwright-browsers playwright install chromium

COPY docker/requirements-local.txt ./requirements-local.txt
RUN pip install --no-cache-dir -r requirements-local.txt

# Switch back to the superset user for security
USER superset

# Use the default entrypoint
CMD ["/app/docker/entrypoints/run-server.sh"]
