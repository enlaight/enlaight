from rest_framework import serializers

from authentication.models.user_profile import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "full_name",
            "email",
            "username",
            "job_title",
            "department",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "active",
            "avatar",
            "joined_at",
            "is_staff",
            "client_id",
        ]
        read_only_fields = [
            "id",
            "email",
            "username",
            "role",
            "is_active",
            "is_staff",
            "client_id",
        ]
