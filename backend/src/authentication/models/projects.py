from django.db import models

from authentication.models.clients import Clients
from core.models.base import Base


class Projects(Base):
    name = models.TextField()
    client = models.ForeignKey(Clients, on_delete=models.CASCADE, related_name="projects")
    agents = models.ManyToManyField(
        "authentication.Agents",
        related_name="projects",
        blank=True,
        through="authentication.ProjectsAgentsThrough",
        through_fields=("project", "agent"),
    )
    users = models.ManyToManyField(
        "authentication.UserProfile", related_name="projects", blank=True
    )

    def __str__(self):
        return self.name


class ProjectsAgentsThrough(models.Model):
    project = models.ForeignKey(
        Projects, on_delete=models.CASCADE, db_index=True, db_column="projects_id"
    )
    agent = models.ForeignKey(
        "authentication.Agents", on_delete=models.CASCADE, db_index=True, db_column="bots_id"
    )

    class Meta:
        db_table = "authentication_projects_bots"
        constraints = [
            models.UniqueConstraint(fields=["project", "agent"], name="uq_projects_agents")
        ]
        indexes = [models.Index(fields=["project"]), models.Index(fields=["agent"])]
