from rest_framework import serializers

from authentication.models.agents import Agents
from authentication.models.expertise_area import ExpertiseArea
from authentication.models.projects import Projects


class BotPartialUpdateSerializer(serializers.ModelSerializer):
    projects = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Projects.objects.all(), required=False
    )
    expertise_area = serializers.PrimaryKeyRelatedField(
        queryset=ExpertiseArea.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Agents
        fields = ("name", "description", "url_n8n", "projects", "expertise_area")
        extra_kwargs = {
            "name": {"required": False},
            "description": {"required": False, "allow_null": True, "allow_blank": True},
            "url_n8n": {"required": False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def validate(self, attrs):
        new_name = attrs.get("name")
        if new_name:
            qs = Agents.objects.filter(name__iexact=new_name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"name": "A agent with this name already exists."}
                )
        return attrs


class BotExpertiseOnlySerializer(serializers.ModelSerializer):
    expertise_area = serializers.PrimaryKeyRelatedField(
        queryset=ExpertiseArea.objects.all(),
        allow_null=True,
        required=True,
    )

    class Meta:
        model = Agents
        fields = ("expertise_area",)
