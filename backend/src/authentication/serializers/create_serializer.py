from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import UserProfile
from authentication.models.roles import UserRole


class UserCreateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=[(r.value, r.value) for r in UserRole],
        required=False,
        default=UserRole.USER.value,
    )

    class Meta:
        model = UserProfile
        fields = [
            "full_name",
            "email",
            "role",
            "job_title",
            "department",
            "joined_at",
            "avatar",
        ]
