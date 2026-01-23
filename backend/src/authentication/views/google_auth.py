from django.conf import settings
from django.contrib.auth import get_user_model
from google.auth.transport import requests
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class GoogleAuthView(APIView):
    authentication_classes = []  # público
    permission_classes = []  # público

    def post(self, request):
        """
        Espera: { "id_token": "<JWT do Google Identity Services>" }
        Valida o token, cria/busca o usuário e retorna JWT (access/refresh) da app.
        """
        token = request.data.get("id_token")
        if not token:
            return Response(
                {"detail": "id_token é obrigatório."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # valida o ID token contra o client_id da sua app
            payload = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            return Response({"detail": "id_token inválido."}, status=status.HTTP_400_BAD_REQUEST)

        # payload típico: { email, email_verified, name, picture, given_name, family_name, sub }
        email = payload.get("email")
        if not email or not payload.get("email_verified"):
            return Response(
                {"detail": "Email não verificado."}, status=status.HTTP_400_BAD_REQUEST
            )

        first_name = payload.get("given_name") or ""
        last_name = payload.get("family_name") or ""

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
            },
        )

        # emite JWT da sua aplicação
        refresh = RefreshToken.for_user(user)
        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": str(getattr(user, "id", "")),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
        }
        return Response(data, status=status.HTTP_200_OK)
