from rest_framework import serializers

from authentication.models.expertise_area import ExpertiseArea


class ExpertiseAreaPartialUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertiseArea
        fields = ("name", "description")
        extra_kwargs = {
            "name": {"required": False},
            "description": {"required": False, "allow_blank": True, "allow_null": True},
        }

    def validate(self, attrs):
        new_name = attrs.get("name")
        if new_name:
            qs = ExpertiseArea.objects.filter(name__iexact=new_name.strip())
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                from rest_framework import serializers as _s

                raise _s.ValidationError(
                    {"name": "An expertise area with this name already exists."}
                )
        return attrs
