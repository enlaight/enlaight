from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models

from authentication.models.agents import Agents
from authentication.models.chat_sessions import ChatSession

User = get_user_model()


class ChatFavorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_favorites")
    agent = models.ForeignKey(Agents, on_delete=models.CASCADE, related_name="chat_favorites")
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="favorites")
    message_id = models.CharField(max_length=255)  # id front
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "agent", "session", "message_id")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} - {self.agent_id} - {self.message_id}"
