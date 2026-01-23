from rest_framework import serializers

from authentication.models.expertise_area import ExpertiseArea


class ExpertiseAreaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertiseArea
        fields = ("name", "description")
        extra_kwargs = {
            "name": {"required": True},
            "description": {"required": False, "allow_blank": True, "allow_null": True},
        }

    def validate_name(self, value: str) -> str:
        if ExpertiseArea.objects.filter(name__iexact=value.strip()).exists():
            raise serializers.ValidationError("An expertise area with this name already exists.")
        return value
