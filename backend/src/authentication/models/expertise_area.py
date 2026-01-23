from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

from core.models.base import Base


class ExpertiseArea(Base):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Expertise Area"
        verbose_name_plural = "Expertise Areas"
        db_table = "expertise_areas"
        ordering = ["name"]
        indexes = [models.Index(fields=["name"])]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                name="uq_expertisearea_name_ci",
                violation_error_message="An expertise area with this name already exists.",
            )
        ]

    def __str__(self) -> str:
        return self.name
