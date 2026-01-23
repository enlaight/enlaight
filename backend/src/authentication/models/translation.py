from django.db import models

from core.models.base import Base


class Translation(Base):
    source_text = models.CharField(max_length=191, db_index=True)
    target_lang = models.CharField(max_length=10)
    translated_text = models.TextField()
    namespace = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source_text", "target_lang", "namespace"],
                name="uniq_source_lang_namespace",
            )
        ]
        indexes = [
            models.Index(fields=["target_lang", "namespace"]),
        ]

    def __str__(self):
        return f"[{self.target_lang}] {self.source_text[:40]} -> {self.translated_text[:40]}"
