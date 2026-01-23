import os

from django.db import models

from core.models.base import Base


def avatar_upload_to(instance, filename):
    _, ext = os.path.splitext(filename)
    ext = (ext or ".jpg").lower()
    return f"agents/{instance.id}/avatar{ext}"


class Agents(Base):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to=avatar_upload_to, null=True, blank=True)
    url_n8n = models.URLField(blank=False, null=False)
    expertise_area = models.ForeignKey(
        "authentication.ExpertiseArea",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agents",
    )

    class Meta:
        verbose_name = "Agent"
        verbose_name_plural = "Agents"
        db_table = "agents"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name

    @property
    def initials(self) -> str:
        parts = [p for p in self.name.strip().split() if p]
        if not parts:
            return ""
        if len(parts) == 1:
            return parts[0][0].upper()
        return (parts[0][0] + parts[-1][0]).upper()
