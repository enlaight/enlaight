FROM python:3.11.3-alpine3.18

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /src

RUN apk update && apk add --no-cache \
    build-base \
    linux-headers \
    pkgconf \
    mariadb-connector-c-dev \
    mariadb-dev \
    curl \
    nodejs \
    npm \
    netcat-openbsd \
    postgresql-client

RUN npm install -g mjml

RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH" \
    PYTHONPATH="/src"

COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && \
    poetry install --no-root --no-interaction --no-ansi && \
    pip install --no-cache-dir gunicorn

COPY src /src/
RUN cp core/settings.sample.py core/settings.py
COPY scripts /scripts
RUN chmod +x /scripts/*.sh

ENTRYPOINT ["sh", "/scripts/entrypoint.sh"]
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
