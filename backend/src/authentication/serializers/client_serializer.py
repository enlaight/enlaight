from rest_framework import serializers

from authentication.models.clients import Clients


class ClientSerializer(serializers.ModelSerializer):

    class Meta:
        model = Clients
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
