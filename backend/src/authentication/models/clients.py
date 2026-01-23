import uuid

from django.db import models

from core.models.base import Base


class Clients(Base):
    name = models.TextField()

    def __str__(self):
        return self.name
