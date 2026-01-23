import os
from datetime import timedelta

from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.utils import timezone

from authentication.models.clients import Clients
from authentication.models.roles import UserRole
from core.models.base import Base


def avatar_upload_to(instance, filename):
    _, ext = os.path.splitext(filename)
    ext = (ext or ".jpg").lower()
    return f"users/{instance.id}/avatar{ext}"


def default_token_expiration():
    return timezone.now() + timedelta(hours=1)


class UserProfile(AbstractUser, Base):
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField("first name", max_length=30)
    last_name = models.CharField("last name", max_length=150)
    full_name = models.CharField("name", max_length=120)
    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=32,
        choices=[(role.value, role.name) for role in UserRole],
        default=UserRole.USER.value,
    )
    job_title = models.CharField(max_length=80, blank=True)  # ex.: "Product Manager"
    department = models.CharField(max_length=80, blank=True)  # ex.: "Product", "Engineering"
    joined_at = models.DateField(auto_now_add=True)

    password_reset_token = models.CharField(max_length=128, blank=True, null=True)
    password_reset_token_expires_at = models.DateTimeField(
        default=default_token_expiration, blank=True, null=True
    )

    client = models.ForeignKey(
        Clients, on_delete=models.CASCADE, related_name="user_profiles", null=True, blank=True
    )  # admins podem não ter client; demais usuários devem ter

    avatar = models.ImageField(upload_to=avatar_upload_to, null=True, blank=True)

    active = models.BooleanField(default=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    def __str__(self):
        return f"{self.email} ({self.role})"
