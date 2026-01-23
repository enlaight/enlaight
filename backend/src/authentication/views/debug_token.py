import os

from django.conf import settings
from django.contrib.auth import get_user_model
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@swagger_auto_schema(
    method="post",
    operation_summary="Debug: gerar access token para usuário",
    operation_description="Gera um access token para o usuário informado (apenas DEBUG=True e com debug token correto).",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "email": openapi.Schema(type=openapi.TYPE_STRING),
            "debug_token": openapi.Schema(type=openapi.TYPE_STRING),
        },
        required=["email", "debug_token"],
    ),
    responses={200: openapi.Response(description="Access token gerado"), 403: "Forbidden"},
)
@api_view(["POST"])
@permission_classes([AllowAny])
def debug_token(request):
    if not settings.DEBUG:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data or {}
    email = payload.get("email")
    token = payload.get("debug_token")

    if not email or not token:
        return Response(
            {"detail": "email and debug_token required"}, status=status.HTTP_400_BAD_REQUEST
        )

    secret = os.getenv("DEBUG_TOKEN")
    if not secret or token != secret:
        return Response({"detail": "Invalid debug token"}, status=status.HTTP_403_FORBIDDEN)

    User = get_user_model()
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    # import lazily to avoid circular imports
    from authentication.views.authentication import make_refresh_for_user

    refresh = make_refresh_for_user(user)
    access = refresh.access_token
    return Response({"access": str(access), "refresh": str(refresh)})
