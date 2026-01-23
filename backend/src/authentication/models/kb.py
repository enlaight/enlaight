import uuid

from django.db import models

from authentication.models.projects import Projects


class KBLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    external_id = models.CharField(max_length=128, db_index=True)
    name = models.CharField(max_length=255, blank=True)
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name="kb_links")

    class Meta:
        db_table = "kb_links"
        unique_together = [("project", "external_id")]
