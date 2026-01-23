from rest_framework import serializers


class KBFileAddSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)
    hash_id = serializers.CharField(required=True, max_length=256)
