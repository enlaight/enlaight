from django.db import models

from authentication.models.clients import Clients
from authentication.models.projects import Projects
from core.models.base import Base


class Boards(Base):
    config = models.TextField()
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name="boards")
    client = models.ForeignKey(
        Clients, on_delete=models.CASCADE, related_name="boards", null=True, blank=True
    )
