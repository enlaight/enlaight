from rest_framework import serializers

from authentication.models.boards import Boards
from authentication.models.clients import Clients
from authentication.models.projects import Projects


class BoardSerializer(serializers.ModelSerializer):
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Projects.objects.all(),
        source="project",
        write_only=False,  # serve para leitura e escrita
    )
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Clients.objects.all(),
        source="client",
        write_only=False,  # serve para leitura e escrita
    )

    class Meta:
        model = Boards
        fields = [
            "id",
            "config",
            "client_id",
            "project_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
