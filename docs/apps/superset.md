# Superset - Data Visualization & Analytics

## Overview

**Apache Superset** is an open-source data visualization and business intelligence platform integrated into Enlaight. It enables users to create interactive dashboards, charts, and reports from data sources, providing actionable insights and analytics capabilities.

**Key Features:**
- Interactive dashboards and visualizations
- SQL query builder and SQL lab
- Role-based access control (RBAC)
- Embedded dashboard support for frontend
- Guest access with JWT tokens
- Multiple database connectors
- Caching and performance optimization

**Port**: 8088 (locally)

**Local URL**: `http://localhost:8088`

**Components:**
- **Frontend**: React-based UI
- **Backend**: Flask/Python
- **Database**: MySQL (metadata)
- **Cache**: Redis
- **Async Tasks**: Celery (optional)

---

## Database Configuration

### Superset Metadata Database

Superset stores its own metadata in a separate MySQL database:

**Environment Variables (from env.sample):**
```env
SUPERSET_DB_NAME=superset_database
SUPERSET_DB_USER=<superset_user>
SUPERSET_DB_PASSWORD=<superset_password>
DATABASE_URL=mysql+mysqldb://${SUPERSET_DB_USER}:${SUPERSET_DB_PASSWORD}@mysql:3306/${SUPERSET_DB_NAME}?charset=utf8mb4
SQLALCHEMY_DATABASE_URI=mysql+pymysql://${SUPERSET_DB_USER}:${SUPERSET_DB_PASSWORD}@mysql:3306/${SUPERSET_DB_NAME}?charset=utf8mb4
```

**Tables Created:**
- `dashboard` - Dashboard definitions
- `slice` - Charts/visualizations
- `query` - Saved SQL queries
- `database` - Connected data sources
- `table` - Cached table schemas
- `permission` - RBAC granular permissions
- `role` - User roles
- `ab_user` - User accounts

### Connecting Data Sources

**Enlaight Database Connection:**
1. Access Superset: `http://localhost:8088`
2. Data → Databases → "+ Database"
3. Configure:
   - **Engine**: MySQL
   - **Host**: `mysql`
   - **Port**: 3306
   - **Database**: `enlaight_database`
   - **User**: `enlaight`
   - **Password**: (from env)
4. Test connection
5. Sync tables

**Additional Data Sources:**
- PostgreSQL (n8n database)
- CSV/Excel uploads
- APIs via specialized connectors
- BigQuery, Snowflake, etc.

---

## Core Concepts

### Databases & Tables

**Database:**
- Connection to a data source
- MySQL, PostgreSQL, BigQuery, etc.
- Credentials and connection settings

**Table/Dataset:**
- Table from connected database
- Cached schema and sample data
- Queryable in SQL Lab and chart builder

### Slices (Charts)

**Slice** = A single visualization:
- Line chart, bar chart, pie chart, etc.
- Based on SQL query or table
- Has filters, aggregations, grouping
- Can be standalone or part of dashboard

**Chart Types:**
- Time series (line, area)
- Categorical (bar, column)
- Distribution (histogram, box plot)
- Composition (pie, sunburst)
- Statistical (scatter, bubble)
- Geographic (map, deck.gl)
- Table (pivot table, data tables)

### Dashboards

**Dashboard** = Collection of charts:
- Contains multiple slices
- Filters apply to all charts
- Responsive layout
- Can be shared or embedded

**Dashboard Components:**
- Tab layout (organize by tabs)
- Filters (apply across slices)
- Parameters (dynamic values)
- Refresh interval
- Export options

---

## Admin Configuration

### Initial Setup

**Default Credentials (from env.sample):**
```env
SUPERSET_ADMIN_USERNAME=admin
SUPERSET_ADMIN_EMAIL=admin@example.com
SUPERSET_ADMIN_FIRSTNAME=Admin
SUPERSET_ADMIN_LASTNAME=User
SUPERSET_ADMIN_PASSWORD=admin
```

**First Login:**
1. Access http://localhost:8088
2. Username: `admin`
3. Password: `admin`

### Security Configuration

**Secret Key**
```env
SUPERSET_SECRET_KEY=your_very_long_random_secret_key_at_least_42_characters
```

**Optional Configuration (from env.sample):**
```env
SUPERSET_BASE_URL=http://localhost:8088  # Production: https://superset.enlaight.example
SUPERSET_LOG_LEVEL=INFO
```

### Feature Flags

**Dashboard RBAC (from env.sample):**
```env
FEATURE_FLAGS='{"PLAYWRIGHT_REPORTS_AND_THUMBNAILS": true, "DASHBOARD_RBAC": true}'
```

Enables:
- Role-based dashboard access
- Screenshot/PDF generation
- Advanced permission controls

### Embedded Superset

**Configuration (from env.sample):**
```env
SUPERSET_FEATURE_EMBEDDED_SUPERSET=true
PUBLIC_ROLE_LIKE=Gamma      # Default user role
```

**CORS Settings:**
```env
ENABLE_CORS=true
CORS_OPTIONS='{"origins": ["http://localhost:8080"], "supports_credentials": true}'
```

**Frame Policy:**
```env
HTTP_HEADERS='{"X-Frame-Options": "ALLOWALL"}'  # Allow embedding
# Production: Change to appropriate origin
```

---

## Guest Access & JWT Tokens

### Guest Token Authentication

For embedding dashboards in frontend without user login:

**Guest Token Configuration (from env.sample):**
```env
GUEST_ROLE_NAME=Guest_User
GUEST_TOKEN_JWT_SECRET=generated_guest_token_jwt
GUEST_TOKEN_JWT_AUDIENCE=superset
GUEST_TOKEN_JWT_EXP_SECONDS=3600  # 1 hour expiration
```

### Getting Guest Token

**API Endpoint:**
```bash
GET /api/guest-token/
```

**Backend Implementation (Example):**
```python
# views/get_guest_token.py
import requests
from rest_framework.views import APIView
from rest_framework.response import Response

class GetGuestTokenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # User must have dashboard access
        dashboard_id = request.data.get('dashboard_id')
        
        # Request guest token from Superset
        response = requests.post(
            f"{settings.SUPERSET_BASE_URL}/api/v1/security/guest_token/",
            json={
                "username": "guest",
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "email": request.user.email,
                "resources": [
                    {
                        "type": "dashboard",
                        "id": dashboard_id
                    }
                ],
                "rls": []  # Row-level security rules (optional)
            },
            headers={
                "Authorization": f"Bearer {self.get_superset_admin_token()}"
            }
        )
        
        return Response(response.json())
```

### Embedding in Frontend

**Using Superset Embedded SDK:**
```typescript
import { EmbeddedDashboard } from '@superset-ui/embedded-sdk';

function DashboardComponent() {
  return (
    <EmbeddedDashboard
      id="1"
      supersetDomain="http://localhost:8088"
      mountPath="/embedded/"
      fetchGuestToken={() => fetch('/api/get-guest-token/').then(r => r.json())}
    />
  );
}
```

---

## Creating Dashboards

### Step 1: Create Data Source Connection

1. Data → Databases → "+ Database"
2. Select database type (MySQL, PostgreSQL, etc.)
3. Enter connection details
4. Click "Test Connection"
5. Click "Save & Connect"

### Step 2: Create Slice (Chart)

**Method 1: Using Chart Builder**
1. Data → Create Chart
2. Select table
3. Choose visualization type
4. Configure metrics and dimensions
5. Add filters
6. Click "Save"

**Method 2: Using SQL Lab**
1. SQL → SQL Lab
2. Write custom SQL query
3. Click "Run"
4. Click "Save as chart" (in visualization options)
5. Configure visualization

**Example Query:**
```sql
SELECT 
  DATE_TRUNC(created_at, MONTH) as month,
  COUNT(*) as user_count
FROM enlaight_database.authentication_userprofile
GROUP BY month
ORDER BY month DESC
```

### Step 3: Create Dashboard

1. Dashboards → "+ Dashboard"
2. Enter dashboard name
3. Click "Save"
4. Edit dashboard
5. Add slices (charts)
6. Configure filters
7. Save

### Step 4: Configure Filters

**Dashboard Filters:**
1. Edit dashboard
2. Click "Filter"
3. Select column to filter
4. Configure filter type:
   - Single select
   - Multiple select
   - Autocomplete
   - Date range
   - Time range

**Filter Behavior:**
- Filters apply to all compatible slices
- Users adjust filter values in real-time
- Charts update dynamically

---

## Roles & Permissions

### Default Roles

**Admin**
- Full access to all dashboards
- Create/edit dashboards
- Manage users
- System configuration

**Alpha**
- Create and edit own dashboards
- View all dashboards/charts
- Edit own charts

**Gamma**
- View dashboards (assigned)
- Cannot create/edit charts
- Guest user role

**sql_lab**
- Access to SQL Lab
- Write and run queries
- Create charts from queries

**Public**
- View published/public dashboards
- Read-only access

### Custom Roles

Create custom roles for specific use cases:

1. Settings → Roles/Permissions
2. "+ Role"
3. Assign permissions:
   - Dataset access (can query specific tables)
   - Dashboard access (can view specific dashboards)
   - Feature access (SQL Lab, API, etc.)

### Row-Level Security (RLS)

Restrict dashboard data by user:

**Example:**
- Sales user sees only their region's data
- Support user sees only their company's tickets

**Configuration:**
1. Settings → Roles/Permissions → List Rules
2. Create RLS rule
3. Define SQL condition:
   ```sql
   region = '{{ current_user_attr('region') }}'
   ```
4. Assign to role

---

## Caching & Performance

### Query Caching

**Configuration (from env.sample):**
```env
REDIS_HOST=redis
REDIS_PORT=6379
```

**Cache Strategy:**
- Results cached in Redis
- Cache key = SQL query hash
- Expires after timeout
- Manual refresh available

### Cache Control

**In Chart:**
1. Edit chart
2. Advanced → Cache Timeout
3. Set TTL (0 = no cache)

**View Logs:**
```bash
docker compose exec superset redis-cli
KEYS *               # List cache keys
TTL <key>           # Check expiration
FLUSHDB             # Clear all cache
```

---

## SQL Lab

**SQL Lab** allows power users to write and execute custom SQL queries:

### Features

- Code editor with syntax highlighting
- Multiple database support
- Query history
- Saved queries
- Result export
- Chart creation from results

### Using SQL Lab

1. SQL → SQL Lab
2. Select database and schema
3. Write SQL query
4. Click "Run Query"
5. View results in table
6. Click "Save query" or "Create chart"

### Saved Queries

**View saved queries:**
- SQL → Saved Queries

**Query Permissions:**
- Owner can view/edit
- Can be shared with other users
- Apply RLS rules

---

## Configuration Files

### Docker Configuration

**Dockerfile:**
```dockerfile
FROM apache/superset:latest
# Custom setup
COPY docker/ /app/docker
COPY requirements-local.txt /app/
RUN pip install -r /app/requirements-local.txt
```

**Docker Entrypoint:**
```bash
# docker/docker-init.sh
# Initialize admin user
# Create default databases
# Apply RBAC settings
```

### Environment Variables

**Key Settings:**
```env
# Admin Configuration
SUPERSET_ADMIN_USERNAME=admin
SUPERSET_ADMIN_PASSWORD=secure_password
SUPERSET_SECRET_KEY=generate_long_random_string

# Database
DATABASE_URL=mysql+mysqldb://superset:password@mysql:3306/superset_database
SQLALCHEMY_DATABASE_URI=mysql+pymysql://...

# Redis (cache)
REDIS_HOST=redis
REDIS_PORT=6379

# Superset Features
SUPERSET_BASE_URL=http://superset.enlaight.ai
SUPERSET_FEATURE_EMBEDDED_SUPERSET=true

# Embedded Access
GUEST_ROLE_NAME=Guest_User
GUEST_TOKEN_JWT_SECRET=long_random_secret
GUEST_TOKEN_JWT_EXP_SECONDS=3600

# CORS
ENABLE_CORS=true
CORS_OPTIONS='{"origins": ["https://app.example.com"], "supports_credentials": true}'

# Frame Embedding
HTTP_HEADERS='{"X-Frame-Options": "ALLOWALL"}'
```

---

## Common Tasks

### Creating a Sales Dashboard

1. **Create Database Connection** to sales database
2. **Create Slices:**
   - Monthly sales trend (line chart)
   - Sales by region (bar chart)
   - Top products (pie chart)
   - Sales forecast (scatter plot)
3. **Create Dashboard**
4. **Add Filters:**
   - Date range
   - Region
   - Product category
5. **Configure Sharing** with sales team
6. **Test Embedding** in frontend

### Creating a User Analytics Dashboard

1. **Query:** User registration trends
   ```sql
   SELECT 
     DATE_TRUNC(joined_at, DAY) as date,
     role,
     COUNT(*) as count
   FROM authentication_userprofile
   GROUP BY date, role
   ```
2. **Chart Types:**
   - Time series (total users over time)
   - Pie chart (users by role)
   - Stacked bar (active/inactive)
3. **Add Filters** for date range and role

### Publishing Dashboard

1. Edit dashboard
2. Click "Publish"
3. Share via URL or embed code
4. Configure access permissions
5. Set auto-refresh interval

---

## Troubleshooting

### Superset Won't Start

```bash
# Check logs
docker compose logs superset

# Common issues:
# 1. Database connection failed
docker compose exec superset superset db upgrade

# 2. Admin user not created
docker compose exec superset superset fab create-admin \
  --username admin \
  --firstname Admin \
  --lastname User \
  --email admin@example.com \
  --password admin

# 3. Redis not available
docker compose exec redis redis-cli ping
```

### Dashboard Not Loading

- Check dashboard permissions (user must have access)
- Check data source connection (Data → Databases)
- Verify SQL query (SQL Lab → Run Query)
- Check cache (Redis status)

### Guest Token Invalid

- Verify `GUEST_TOKEN_JWT_SECRET` is set
- Check token expiration time
- Verify dashboard ID exists
- Check CORS configuration

### Slow Query Performance

- Add database indexes
- Use LIMIT in queries
- Cache results (increase TTL)
- Optimize SQL query
- Monitor Redis cache hits

---

## API Reference

### Authentication

**Get CSRF Token:**
```bash
GET /api/v1/security/csrf_token/
```

**Login:**
```bash
POST /api/v1/security/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin",
  "refresh": true
}
```

### Dashboard APIs

**List Dashboards:**
```bash
GET /api/v1/dashboard/
Authorization: Bearer <token>
```

**Get Dashboard:**
```bash
GET /api/v1/dashboard/<id>/
```

**Create Dashboard:**
```bash
POST /api/v1/dashboard/
Content-Type: application/json

{
  "dashboard_title": "My Dashboard",
  "description": "...",
  "slices": [...]
}
```

### Guest Token

**Get Guest Token:**
```bash
POST /api/v1/security/guest_token/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "guest",
  "resources": [
    {
      "type": "dashboard",
      "id": "1"
    }
  ],
  "rls": []
}
```