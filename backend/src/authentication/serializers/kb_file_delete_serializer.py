from rest_framework import serializers


class KBFileDeleteSerializer(serializers.Serializer):
    hash_id = serializers.CharField(required=True, max_length=256)
    file = serializers.CharField(
        required=True, max_length=1024
    )  # assuming file is identified by a string path or name
