import uuid

from django.db import models
from django.utils import timezone


class Base(models.Model):
    id = models.UUIDField(
        primary_key=True, null=False, blank=False, default=uuid.uuid4, serialize=False
    )
    created_at = models.DateTimeField(null=False, blank=False, auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self._state.adding:
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)
