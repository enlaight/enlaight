from django.db import models

from authentication.models.agents import Agents
from authentication.models.user_profile import UserProfile
from core.models.base import Base


class ChatSession(Base):
    session_key = models.TextField(null=False, blank=False)
    agent = models.ForeignKey(
        Agents, on_delete=models.CASCADE, null=False, blank=False, related_name="chat_sessions"
    )
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        null=False,
        blank=False,
        related_name="chat_sessions",
    )
    data = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Session {self.session_key}: (User: {self.user}) || (Agent: {self.agent})"
