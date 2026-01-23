from rest_framework import serializers


class KBEditSerializer(serializers.Serializer):
    hash_id = serializers.CharField(required=True, max_length=256)
    name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
