from rest_framework import serializers

from authentication.models.clients import Clients
from authentication.models.projects import Projects


class ProjectForBotSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Clients.objects.all(), source="client", write_only=True
    )
    client = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Projects
        fields = ["id", "name", "client", "client_id", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
