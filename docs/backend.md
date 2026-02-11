# Backend Architecture & Documentation

## Overview

The Enlaight backend is a **Django REST API** built with modern best practices. It provides secure, scalable endpoints for the frontend to manage projects, assistants (agents), knowledge bases, users, and chat sessions. The backend enforces authentication, authorization, multi-tenancy isolation, and serves as a proxy bridge to n8n webhooks.

**Technology Stack:**
- **Framework**: Django 5.2+
- **API**: Django REST Framework (DRF)
- **Authentication**: JWT via djangorestframework-simplejwt
- **Database**: MySQL 8.4
- **ORM**: Django ORM
- **API Documentation**: drf-yasg (Swagger/OpenAPI)
- **CORS**: django-cors-headers
- **Password Hashing**: PBKDF2 (Django default)
- **Static Files**: WhiteNoise (Compressed storage)

**Port**: 8000

**Base URL**: `http://localhost:8000/api/`

---

## Directory Structure

```
backend/src/
├── manage.py              # Django CLI tool
├── asgi.py               # ASGI entry point
├── core/                 # Django project settings
│   ├── settings.py       # Configuration (database, apps, middleware)
│   ├── urls.py          # Root URL routing
│   ├── wsgi.py          # WSGI entry point
│   ├── views.py         # Core views
│   └── models/          # Shared models
├── authentication/        # Main application (apps)
│   ├── __init__.py
│   ├── urls.py          # API routes
│   ├── permissions.py   # RBAC & multi-tenancy
│   ├── debug_auth.py    # Dev authentication
│   ├── utils.py         # Helper functions
│   ├── models/          # Database models
│   │   ├── user_profile.py
│   │   ├── projects.py
│   │   ├── agents.py
│   │   ├── kb.py        # Knowledge Base
│   │   ├── chat_sessions.py
│   │   ├── clients.py
│   │   ├── boards.py
│   │   ├── roles.py
│   │   ├── expertise_area.py
│   │   └── [More models...]
│   ├── serializers/     # Data serialization (JSON conversion)
│   │   ├── login_serializer.py
│   │   ├── user_profile.py
│   │   ├── [More serializers...]
│   ├── views/           # API endpoints
│   │   ├── authentication.py  # Login, logout, token
│   │   ├── user.py           # User management
│   │   ├── project.py        # Project CRUD
│   │   ├── bot.py            # Agent/bot endpoints
│   │   ├── kb.py             # KB proxy endpoints
│   │   ├── kb_create.py
│   │   ├── kb_delete.py
│   │   ├── kb_file_add.py
│   │   ├── [More views...]
│   ├── services/        # Business logic
│   │   └── [Service classes for complex operations]
│   ├── management/      # Django management commands
│   └── migrations/      # Database schema versions
└── tests/              # Unit & integration tests
```

---

## Core Concepts

### 1. Authentication & JWT

**JWT Token Flow:**

1. **Login** → `POST /api/login/`
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Response** → Returns tokens:
   ```json
   {
     "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
   }
   ```

3. **Token Lifetime** (from `settings.py`):
   - `access_token`: 2 hours
   - `refresh_token`: 1 day
   - Tokens rotate on refresh; old blacktop after rotation

4. **Usage** → Include in all requests:
   ```http
   Authorization: Bearer <access_token>
   ```

5. **Refresh** → `POST /api/refresh/`
   ```json
   {
     "refresh": "<refresh_token>"
   }
   ```
   Returns new `access_token`

**Token Enrichment:**
```python
# Custom claims added to JWT (from authentication.py):
- id (UUID)
- email
- full_name
- role (ADMIN, USER, GUEST)
- is_active
- avatar
- joined_at
- is_staff
- is_superuser
```

### 2. Role-Based Access Control (RBAC)

**Available Roles:**
- `ADMIN` / `ADMINISTRATOR` - Unrestricted access
- `USER` - Project-based access

**Permission Classes** (from `permissions.py`):

```python
# Check if user is admin
is_admin_by_role(user) → bool

# Enforce admin requirement
IsAdminByRole  # Only admins can access

# Enforce admin OR project relationship
IsAdminOrRelatedToBot  # Admin or project member only
```

**Access Validation:**
```python
# Check project access
assert_user_project_access(user, project)
# Raises PermissionDenied if not allowed

# Check KB access
assert_user_kb_access(user, kb_hash_id)
# Validates KB linked to user's project
```

### 3. Multi-Tenancy (Project-Based Isolation)

**Isolation Model:**
- Each user assigned to projects
- Can only access assigned projects
- Admins bypass restrictions
- Knowledge bases, bots linked to projects

**Example Query per User:**
```python
# Non-admin user can only see their projects
user_projects = Project.objects.filter(users__id=user.id)

# Admin sees all projects
if is_admin(user):
    user_projects = Project.objects.all()
```

### 4. Database Models

**Core Models:**

**UserProfile**
```python
- id (UUID)
- email (unique)
- password (hashed PBKDF2)
- role (ADMIN, USER, GUEST)
- full_name
- avatar (optional image)
- is_active
- joined_at (timestamp)
- is_staff, is_superuser
```

**Projects**
```python
- id (UUID)
- name
- description
- created_at
- users (many-to-many relationship)
- clients (foreign key)
```

**Agents (Bots)**
```python
- id (UUID)
- name
- description
- avatar (optional)
- url_n8n (webhook URL hosted in n8n)
- projects (many-to-many)
- expertise_area (optional)
- created_at
```

**KBLink (Knowledge Base)**
```python
- id (UUID)
- external_id (hash from n8n)
- name
- project (foreign key)
- description
- created_at
```

**ChatSession**
```python
- id (UUID)
- user (foreign key)
- bot/agent (foreign key)
- project (foreign key)
- messages (array of message objects)
- created_at, updated_at
```

**Clients**
```python
- id (UUID)
- name
- [Contact info fields]
```

**ExpertiseArea**
```python
- id (UUID)
- name (categorization for bots)
```

---

## API Endpoints

### Authentication Endpoints

```
POST   /api/login/                    # User login
POST   /api/create/                   # Register new user
POST   /api/refresh/                  # Refresh access token
POST   /api/logout/                   # Blacklist refresh token
GET    /api/me/                       # Get current user profile
PATCH  /api/me/update/                # Update current user
POST   /api/password/forgot/          # Request password reset
POST   /api/password/reset/           # Reset password with token
```

### User Management Endpoints

```
GET    /api/users/                    # List all users (admin only)
POST   /api/invite/                   # Send user invitation
POST   /api/invite/confirm/           # Accept invitation
GET    /api/roles/                    # List available roles
GET    /api/users/<uuid>/roles/       # Get user's roles
POST   /api/users/<uuid>/roles/add/   # Add role to user
POST   /api/users/<uuid>/roles/remove/# Remove role from user
POST   /api/login-as/<uuid>/          # Admin impersonation (debug)
```

### Project Endpoints

```
GET    /api/projects/                 # List user's projects
POST   /api/projects/                 # Create new project
GET    /api/projects/<uuid>/          # Get project detail
PATCH  /api/projects/<uuid>/          # Update project
DELETE /api/projects/<uuid>/          # Delete project
POST   /api/projects/<uuid>/users/    # Assign users to project
```

### Bot/Agent Endpoints

```
GET    /api/bots/                     # List bots accessible to user
POST   /api/bots/                     # Create new bot
GET    /api/bots/<uuid>/             # Get bot detail
PATCH  /api/bots/<uuid>/             # Update bot
DELETE /api/bots/<uuid>/             # Delete bot
```

### Knowledge Base (KB) Proxy Endpoints

These proxy requests to n8n for KB operations:

```
GET    /api/kb/list/                  # List all KBs (proxy to n8n)
POST   /api/kb/create/                # Create KB (proxy to n8n)
GET    /api/kb/get/                   # Get KB detail (proxy)
PATCH  /api/kb/edit/                  # Edit KB (proxy)
DELETE /api/kb/delete/                # Delete KB (proxy)
POST   /api/kb/files/add/             # Upload file to KB (proxy)
DELETE /api/kb/files/delete/          # Delete KB file (proxy)
GET    /api/kb/files/list/            # List KB files (proxy)
POST   /api/kb/attach/                # Link KB to project
```

### Chat Session Endpoints

```
GET    /api/chat-session/             # List chat sessions
POST   /api/chat-session/             # Create chat session
GET    /api/chat-session/<uuid>/      # Get session detail
PATCH  /api/chat-session/<uuid>/      # Update session
DELETE /api/chat-session/<uuid>/      # Delete session
```

### Additional Endpoints

```
GET    /api/clients/                  # List clients
POST   /api/clients/                  # Create client
GET    /api/search/                   # Global search
POST   /api/boards/                   # Dashboard management
POST   /api/expertise-areas/          # Expertise categories
POST   /api/chat-favorites/           # Favorite chat items
POST   /api/translate/                # Translate text (batch)
POST   /api/translate/lookup/         # Lookup translation
```

---

## Serializers (Data Conversion)

Serializers convert Django model instances to/from JSON:

**Example: UserProfileSerializer**
```python
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['id', 'email', 'full_name', 'role', 'avatar']
        read_only_fields = ['id', 'joined_at']
```

**Serializer Types:**
- **ModelSerializer** - Auto-generated from models
- **Custom Fields** - Email validation, file upload
- **Nested Serializers** - Related objects
- **List Serializers** - Many instances

---

## Views & ViewSets

Views handle HTTP requests and return responses:

**Function-Based Views:**
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_project(request):
    serializer = ProjectSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(owner=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**ViewSets (Generic CRUD):**
```python
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter projects by user
        if is_admin_by_role(self.request.user):
            return Project.objects.all()
        return self.request.user.projects.all()
```

**Proxy Views (n8n Integration):**
```python
class KBCreateProxyView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Validate user has project access
        assert_user_project_access(request.user, project)
        
        # Forward to n8n with API key
        response = requests.post(
            f"{N8N_BASE_URL}/webhook/kb/create/",
            json=request.data,
            headers={"Authorization": f"Bearer {N8N_API_KEY}"}
        )
        return Response(response.json())
```

---

## URL Routing

**Root URL Config** (`core/urls.py`):
```python
urlpatterns = [
    path('api/', include('authentication.urls')),
    path('admin/', admin.site.urls),
    path('api/schema/swagger/', swagger_view),
    path('api/schema/redoc/', redoc_view)
]
```

**App URL Config** (`authentication/urls.py`):
```python
urlpatterns = [
    path('login/', LoginView.as_view()),
    path('projects/', include(project_router.urls)),
    path('bots/', include(bot_router.urls)),
    # ... more routes
]
```

Uses DRF's **DefaultRouter** for automatic REST routing.

---

## Database Operations

### Migrations

```bash
# Create migration
docker compose exec backend python manage.py makemigrations authentication

# Apply migrations
docker compose exec backend python manage.py migrate

# Rollback
docker compose exec backend python manage.py migrate authentication [migration_name]
```

### Database Initialization

**init-databases.sql** runs on MySQL startup:
```sql
CREATE DATABASE enlaight_database;
CREATE USER 'enlaight'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON enlaight_database.* TO 'enlaight'@'%';
```

### ORM Queries

```python
# Create
user = UserProfile.objects.create_user(
    email='user@example.com',
    password='secure_password',
    role='USER'
)

# Read
user = UserProfile.objects.get(id=user_id)
users = UserProfile.objects.filter(role='ADMIN')

# Update
user.full_name = "New Name"
user.save()

# Delete
user.delete()

# Relations
project.users.add(user)
project.users.remove(user)
```

---

## Settings Configuration

**Django Settings** (`core/settings.py`):

**Security:**
```python
SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = False  # Production
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")
```

**Database:**
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("BACKEND_DB"),
        "USER": os.getenv("BACKEND_DB_USER"),
        "PASSWORD": os.getenv("BACKEND_DB_PASSWORD"),
        "HOST": os.getenv("MYSQL_HOST"),
        "PORT": 3306
    }
}
```

**JWT Configuration:**
```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
```

**CORS:**
```python
CORS_ALLOW_ALL_ORIGINS = True  # Development only
CORS_ALLOWED_ORIGINS = ["https://app.example.com"]  # Production
```

---

## Logging & Debugging

**Debug Auth:**
```python
# Development only - flexible authentication
from authentication.debug_auth import FlexibleJWTAuthentication
```

**Debug Views:**
```python
# Token inspection endpoints
GET /api/debug/token/        # Inspect JWT token
POST /api/debug/check-token/ # Verify token validity
```

**Health Check:**
```python
GET /api/health/db/  # Database connectivity
```

---

## Error Handling

**DRF Exception Handling:**
```python
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError
)

# Auto-converted to JSON responses:
{
    "detail": "Not found",
    "code": 404
}
```

**Custom Error Responses:**
```python
# Permission denied
raise PermissionDenied("You don't have access to this project")

# Not found
return Response(
    {"error": "Project not found"},
    status=status.HTTP_404_NOT_FOUND
)
```

---

## Management Commands

```bash
# Run any Django command
docker compose exec backend python manage.py [command]

# Create admin user
docker compose exec backend python manage.py createsuperuser

# Database shell
docker compose exec backend python manage.py shell

# Collect static files
docker compose exec backend python manage.py collectstatic --noinput
```

---

## Common Tasks

### Adding a New Endpoint
1. Create model in `models/new_model.py`
2. Run `python manage.py makemigrations`
3. Create serializer in `serializers/new_serializer.py`
4. Create view/viewset in `views/new_view.py`
5. Register route in `urls.py`
6. Test via API documentation at `/api/schema/swagger/`

### Adding Permission Check
```python
# In views.py
from authentication.permissions import assert_user_project_access

def view_function(request, project_id):
    project = Project.objects.get(id=project_id)
    assert_user_project_access(request.user, project)
    # Proceed if authorized
```

### Adding API Documentation
```python
# Use drf-yasg decorators
from drf_yasg.utils import swagger_auto_schema

@swagger_auto_schema(
    operation_description="Create a new project",
    request_body=ProjectSerializer,
    responses={201: ProjectSerializer}
)
def post(self, request):
    # Implementation
```

