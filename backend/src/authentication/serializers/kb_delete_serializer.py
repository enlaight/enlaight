from rest_framework import serializers


class KBDeleteSerializer(serializers.Serializer):
    hash_id = serializers.CharField(required=True, max_length=256)
