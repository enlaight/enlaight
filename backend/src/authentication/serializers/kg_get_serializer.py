from rest_framework import serializers


class KBGetQuerySerializer(serializers.Serializer):
    hash_id = serializers.CharField(required=True)
