from rest_framework import serializers

from authentication.models.expertise_area import ExpertiseArea


class ExpertiseAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertiseArea
        fields = ("id", "name", "description")
