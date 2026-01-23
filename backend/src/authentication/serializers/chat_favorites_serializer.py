from rest_framework import serializers

from authentication.models.chat_favorites import ChatFavorite


class ChatFavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatFavorite
        fields = [
            "id",
            "agent",
            "session",
            "message_id",
            "text",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
