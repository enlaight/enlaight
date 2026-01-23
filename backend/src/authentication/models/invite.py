from datetime import timedelta

from django.db import models
from django.utils import timezone

from authentication.models.roles import UserRole
from core.models.base import Base


def default_invite_expiration():
    return timezone.now() + timedelta(days=15)


class Invite(Base):
    sender = models.ForeignKey(
        "authentication.UserProfile",
        on_delete=models.CASCADE,
        related_name="sent_invites",
    )
    email = models.EmailField(unique=True, max_length=255)
    token = models.UUIDField(unique=True, editable=False)
    role = models.CharField(
        max_length=32,
        choices=[(role.value, role.name) for role in UserRole],
        default=UserRole.USER.value,
    )
    client = models.ForeignKey(
        "authentication.Clients",
        on_delete=models.CASCADE,
        related_name="invites",
        null=False,
        blank=False,
    )
    project = models.ForeignKey(
        "authentication.Projects",
        on_delete=models.CASCADE,
        related_name="invites",
        null=True,
        blank=True,
    )
    expires_at = models.DateTimeField(default=default_invite_expiration)
