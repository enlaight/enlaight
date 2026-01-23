from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from authentication.models import UserProfile


class UserProfileCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = UserProfile
        fields = ("id", "username", "email", "first_name", "last_name", "password", "client_id")
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def validate_email(self, value):
        if UserProfile.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return value

    def validate_username(self, value):
        if UserProfile.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return UserProfile.objects.create_user(**validated_data)
