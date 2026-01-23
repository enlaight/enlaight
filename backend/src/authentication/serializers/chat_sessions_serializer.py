from rest_framework import serializers

from authentication.models.chat_sessions import ChatSession


class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ["session_key", "user", "agent", "data", "created_at"]
