from rest_framework import serializers

from authentication.models.agents import Agents
from authentication.serializers.expertise_area_serializer import ExpertiseAreaSerializer
from authentication.serializers.project_for_bot_serializer import ProjectForBotSerializer


class BotN8nSerializer(serializers.ModelSerializer):
    projects = ProjectForBotSerializer(many=True, read_only=True)
    expertise_area = ExpertiseAreaSerializer(read_only=True)

    class Meta:
        model = Agents
        fields = (
            "id",
            "name",
            "description",
            "url_n8n",
            "expertise_area",
            "projects",
        )
