import os
from pathlib import Path

import drf_yasg
from corsheaders.defaults import default_headers

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")
# print("SECRET_KEY:", SECRET_KEY)
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY ausente no ambiente")


DRF_YASG_STATIC = os.path.join(os.path.dirname(drf_yasg.__file__), "static")
STATICFILES_DIRS = [
    DRF_YASG_STATIC,
]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "ecs": {
            "()": "ecs_logging.StdlibFormatter",
            "service_name": "enlaight-backend",
            "service_version": "1.0.0",
            "utc": True,
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": LOG_LEVEL,
            "formatter": "ecs",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

def env_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in ("1", "true", "yes", "on")


# SECURITY WARNING: don't run with debug turned on in production!
# DEBUG = True
def env_bool(name, default=False):
    return os.getenv(name, str(default)).lower() in ("1", "true", "yes", "on")


DEBUG = env_bool("DEBUG", False)

# ALLOWED_HOSTS = []
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")

N8N_BASE_URL = os.environ.get("N8N_BASE_URL", "").rstrip("/")
N8N_KB_KEY = os.environ.get("N8N_KB_KEY", "")
N8N_TIMEOUT = int(os.environ.get("N8N_TIMEOUT", "15"))

# Optional dedicated UI base for opening workflows in the browser
N8N_UI_BASE_URL = os.environ.get("N8N_UI_BASE_URL", "").rstrip("/")
# Path template to build the UI URL for a workflow (use {id} placeholder)
# Examples: "/workflow/{id}", "/workflows/{id}", "/workflow/{id}/canvas"
N8N_UI_WORKFLOW_PATH_TEMPLATE = os.environ.get("N8N_UI_WORKFLOW_PATH_TEMPLATE", "/workflow/{id}")

SUPERSET_BASE_URL = os.environ.get("SUPERSET_BASE_URL").rstrip("/")
SUPERSET_ADMIN_USER = os.environ.get("SUPERSET_ADMIN_USER", "")
SUPERSET_ADMIN_PASSWORD = os.environ.get("SUPERSET_ADMIN_PASSWORD", "")

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_ACCESS_SECRET = os.getenv("AWS_ACCESS_SECRET")
AWS_REGION = os.getenv("AWS_REGION", "eu-central-1")

CORS_ALLOW_ALL_ORIGINS = True


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_yasg",
    "django_filters",
    # Apps próprias
    "authentication",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}

from datetime import timedelta

SIMPLE_JWT = {
    "ALGORITHM": os.getenv("JWT_ALGORITHM", "HS256"),
    "SIGNING_KEY": os.getenv("JWT_SIGNING_KEY", SECRET_KEY),
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "LEEWAY": 30,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

SWAGGER_SETTINGS = {
    "SECURITY_DEFINITIONS": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "Insira o token JWT como: **Bearer &lt;seu_token&gt;**",
        }
    },
    "USE_SESSION_AUTH": False,
}

INSTALLED_APPS += ["corsheaders"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOW_HEADERS = list(default_headers) + ["authorization"]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = "smtp"
# EMAIL_PORT = 25
# EMAIL_USE_TLS = False
# EMAIL_HOST_USER = ""
# EMAIL_HOST_PASSWORD = ""
# DEFAULT_FROM_EMAIL = "Enlaight <noreply@enlaight.local>"

EMAIL_HOST = "email-smtp.eu-central-1.amazonaws.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = (
    "your_email_smtp_username"  # replace with your SMTP username
)
# EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
# EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = "Enlaight <noreply@enlaight.local>"


WSGI_APPLICATION = "core.wsgi.application"

AUTH_USER_MODEL = "authentication.UserProfile"

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("BACKEND_DB", "enlaight_database"),
        "USER": os.environ.get("BACKEND_DB_USER", "enlaight"),
        "PASSWORD": os.environ.get("BACKEND_DB_PASSWORD", "enlaight"),
        "HOST": os.environ.get("MYSQL_HOST", "mysql" if not DEBUG else "localhost"),
        "PORT": os.environ.get("MYSQL_PORT", "3306"),
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "America/Sao_Paulo"

USE_I18N = True

USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"  # compress and cache static files
)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATICFILES_DIRS = [BASE_DIR / "static"]

STATIC_URL = "/static/"
STATIC_ROOT = "/static"
