from datetime import datetime

from django.contrib.auth.models import User
from django.db import models

from core import settings
from core.models.base import Base


class UserInvites(Base):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invites"
    )  # user who sent the invite
    invitation_link = models.CharField(max_length=600)
