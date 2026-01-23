from rest_framework import serializers

from authentication.models.agents import Agents


class BotCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agents
        fields = ["name", "description", "url_n8n"]
        extra_kwargs = {
            "name": {"required": True},
            "description": {"required": False, "allow_blank": True},
            "url_n8n": {"required": True},
        }
