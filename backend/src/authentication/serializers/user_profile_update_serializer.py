from rest_framework import serializers

from authentication.models.roles import UserRole
from authentication.models.user_profile import UserProfile


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = [
            "full_name",
            "first_name",
            "last_name",
            "email",
            "username",
            "avatar",
            "password",
            "password_confirm",
            "role",
        ]
        # email must not be updated via this endpoint; other fields are optional
        extra_kwargs = {
            "role": {"read_only": True},
            "email": {"read_only": True},
            "client_id": {"read_only": True},
            "username": {"required": False},
            "full_name": {"required": False},
            "first_name": {"required": False},
            "last_name": {"required": False},
            "avatar": {"required": False},
        }

    def validate_username(self, value):
        # ensure username is unique (excluding current user)
        user = self.context["request"].user
        qs = UserProfile.objects.filter(username__iexact=value).exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError("Este username já está em uso.")
        return value

    def validate(self, attrs):
        pwd = attrs.get("password")
        pwd2 = attrs.get("password_confirm")
        if pwd or pwd2:
            if not pwd:
                raise serializers.ValidationError(
                    {"password": "Campo obrigatório para alterar senha."}
                )
            if not pwd2:
                raise serializers.ValidationError({"password_confirm": "Confirme a senha."})
            if pwd != pwd2:
                raise serializers.ValidationError({"password_confirm": "As senhas não conferem."})
        return attrs

    def update(self, instance, validated_data):
        user = self.context["request"].user

        # role change allowed only for administrators
        if "role" in self.initial_data:
            if (
                getattr(user, "role", None) == UserRole.ADMINISTRATOR.value
                or getattr(user, "role", None) == UserRole.ADMINISTRATOR
            ):
                instance.role = self.initial_data["role"]
            else:
                validated_data.pop("role", None)

        # handle password separately
        password = validated_data.pop("password", None)
        validated_data.pop("password_confirm", None)

        # ensure email is never updated through this serializer
        validated_data.pop("email", None)

        # update standard fields
        instance = super().update(instance, validated_data)

        if password:
            instance.set_password(password)
            instance.save()

        return instance
