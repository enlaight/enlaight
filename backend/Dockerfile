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
    netcat-openbsd

RUN npm install -g mjml

RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH" \
    PYTHONPATH="/src"

COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && \
    poetry install --no-root --no-interaction --no-ansi

COPY src /src/
COPY scripts /scripts
RUN chmod +x /scripts/*.sh

ENTRYPOINT ["sh", "/scripts/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
