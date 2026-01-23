from rest_framework import serializers


class KBCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    project_id = serializers.UUIDField()
