# Enlaight

````markdown
Enlaight is a full-stack application built with modern frontend and backend technologies, which .
````

## 🧭 Navigation:

1. **[Backend Alterations](#-backend-db-alterations)**
2. **[n8n Configuration](#-n8n-configuration)**
3. **[Admin Credentials](#-admin-credentials-default)**
4. **[Sprints](#-sprints)**
5. **[Technologies Used](#-technologies-used)**


## 🚀 Getting Started (Local Setup)

### 1. Environment Configuration
- Copy `env.sample` to `.env`
- Update any required keys, secrets, or configuration values

```bash
cp env.sample .env
````

### 2. Build and Start the Application

Run the following commands:

```bash
make build
make start
```

### 3. Available Commands

To see all available Makefile commands:

```bash
make help
```

### 4. Reset the Installation

If you change `.env` or `docker-compose` files and need a clean setup:

```bash
make reset
```

## 🧩 Backend DB Alterations

### Database Migrations

#### Create a New Migration

```bash
docker compose exec backend python manage.py makemigrations authentication --name add_user_table
```

#### Apply Migrations

```bash
docker compose exec backend python manage.py migrate
```


## 🔄 n8n Configuration

To access n8n locally, you might need to add the following entry to your `/etc/hosts` file:

```text
127.0.0.1 n8n.localhost
```

## 🔐 Admin Credentials (default)

### Enlaight Application

Upon initialization, the main application will create an admin user for first access.
From then on, more accounts can be created. If you want to personalize this, you
can make changes to file `./backend/mysql/init/set_admin.sql` or add any files for db changes in
this `mysql/init` folder. The default credentials created are:

**Email**: admin@localhost.ai  
**PW**: 123456


### Superset Application

Upon initialization, the `.env` file will set the credentials to an admin
user for Superset. The sample file has this as a default, but personalization
is recommended in case of deployment. The default local credentials created are:

**User**: admin  
**PW**: admin

## 🗓️ Sprints

### **Sprint 1:** 12 Jan 2026 – 25 Jan 2026

- Create single docker compose with everything necessary for the stack to run:
    - n8n
    - Superset
    - Postgres
    - Redis
    - API
    - Frontend Client
- Create makefile with the following commands
    - start - runs a docker compose up command to start all applications
    - stop - stop all containers
    - clear - stop all containers and remove all related volumes
    - build - run only the build command for the Frontend application, leaving the built artifacts in the dist or build folder
    - test - run all lint and unity tests
- Move all credentials to be loaded from ENV variables. Also, create an env.sample file that must be enough to get started with the application if no changes are made in the docker compose env variables
- Create public repo with this initial version and a very simple readme file


### **Sprint 2:** 26 Jan 2026 – 08 Feb 2026

- Create OpenAPI spec + Swagger for API endpoints
- Create basic test unitary + lintting structure
- Create a script that create defaults whenever spinning up the application for the first time
    - n8n
        - Knowledge flows + endpoints
        - Use those endpoints to create a sample knowledge base and index a sample document
        - Sample agent with access to sample the knowledge base and that can be plugged to the v2 application
    - db
        - Create sample data points that can be queried by superset
    - superset
        - Create sample visualizations to be used in a sample initial board (line, bar and pie charts)
    - API + Client
        - Create sample board that display the sample visualizations in a single board
        - Create sample agent that uses the demo n8n flow created


### **Sprint 3:** 09 Feb 2026 – 22 Feb 2026

- Documentation
    - Draw general architecture of the application
        - Explain what each portion is responsible for
    - Explain how n8n agents are created and plugged into the core application
    - Explain how knowledge bases are created and plugged into the core application
    - Explain how new Airflow tasks can be created to ingest and process data
    - Create final docs  - OPERATIONS.md, [SECURITY.md](http://SECURITY.md), runbooks
- Fix 100% of lint recommendations and get to at least 70% unitary test coverage
- Create basic logger structure + investigate ECS format and potentially open telemetry
- Create fallback logging n8n flow

### Upcoming Sprints:

> **Sprint 4:** 23 Feb 2026 – 08 Mar 2026

> **Sprint 5:** 09 Mar 2026 – 22 Mar 2026

> **Sprint 6:** 23 Mar 2026 – 05 Apr 2026

> **Sprint 7:** 06 Apr 2026 – 19 Apr 2026


## 🛠️ Technologies Used

### Frontend

* Vite
* TypeScript
* React
* shadcn-ui
* Tailwind CSS

### Backend

* Django (Python)

### Databases & Services

* MySQL
* PostgreSQL
* Redis
