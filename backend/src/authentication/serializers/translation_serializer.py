from rest_framework import serializers

from authentication.models.translation import Translation


class TranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Translation
        fields = ["id", "source_text", "target_lang", "translated_text", "namespace"]
