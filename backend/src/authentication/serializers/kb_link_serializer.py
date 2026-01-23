from rest_framework import serializers


class KBLinkSerializer(serializers.Serializer):
    hash_id = serializers.CharField(max_length=128)
    name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text="Optional local display name; does not rename the workflow in n8n.",
    )
