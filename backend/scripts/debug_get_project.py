# script to reproduce project GET in-process
import os

import django
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
# ensure any env var if needed
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

# create or get a test user
user, created = User.objects.get_or_create(
    email="debug@example.com",
    defaults={"username": "debuguser", "first_name": "Debug", "last_name": "User"},
)
if created:
    user.set_unusable_password()
    user.save()

refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

c = Client(HTTP_AUTHORIZATION=f"Bearer {access_token}")
resp = c.get("/authentication/projects/")
print("status", resp.status_code)
print(resp.content.decode())
