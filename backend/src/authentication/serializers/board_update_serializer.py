from rest_framework import serializers

from authentication.models.boards import Boards
from authentication.models.clients import Clients
from authentication.models.projects import Projects


class BoardUpdateSerializer(serializers.ModelSerializer):
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Projects.objects.all(), source="project", required=False
    )
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Clients.objects.all(), source="client", required=False
    )
    config = serializers.CharField(required=False)

    class Meta:
        model = Boards
        fields = [
            "id",
            "config",
            "project_id",
            "client_id",
        ]
        read_only_fields = ["id", "project_id", "client_id"]
