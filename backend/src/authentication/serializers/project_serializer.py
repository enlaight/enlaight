from rest_framework import serializers

from authentication.models.clients import Clients
from authentication.models.projects import Projects
from authentication.serializers.bot_serializer import BotN8nSerializer


class ProjectSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(queryset=Clients.objects.all(), source="client")
    client = serializers.StringRelatedField(read_only=True)
    bots = BotN8nSerializer(many=True, read_only=True)

    class Meta:
        model = Projects
        fields = ["id", "name", "client", "client_id", "created_at", "updated_at", "bots"]
        read_only_fields = ["id", "created_at", "updated_at", "bots"]
