from rest_framework import serializers

from authentication.models.user_profile import UserProfile


class UserDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    client_id = serializers.UUIDField(
        source="client.id", read_only=True, required=False, allow_null=True
    )

    class Meta:
        model = UserProfile
        fields = (
            "id",
            "full_name",
            "email",
            "role",
            "job_title",
            "department",
            "joined_at",
            "avatar",
            "active",
            "is_staff",
            "is_active",
            "client_id",
        )

    def get_avatar(self, obj):
        if obj.avatar and hasattr(obj.avatar, "url"):
            return obj.avatar.url
        return None
