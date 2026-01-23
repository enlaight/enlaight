from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(
        required=False, help_text="Informe o username (não envie se estiver usando email)."
    )
    email = serializers.EmailField(
        required=False,
        help_text="Informe um email válido (não envie se estiver usando username).",
        error_messages={"invalid": "Informe um email válido no formato example@example.com"},
    )
    password = serializers.CharField(write_only=True, help_text="Senha do usuário")

    def validate(self, data):
        if not data.get("username") and not data.get("email"):
            raise serializers.ValidationError("Informe username ou email.")
        if data.get("username") and data.get("email"):
            raise serializers.ValidationError("Informe apenas um dos campos: username ou email.")
        return data
