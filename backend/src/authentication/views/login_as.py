from django.contrib.auth import get_user_model
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken


class LoginAsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="login_as",
        operation_summary="Impersonate a user (admin only)",
        operation_description="Generates JWT tokens for another user. Only available to ADMINISTRATOR role.",
        manual_parameters=[
            openapi.Parameter(
                "user_id",
                openapi.IN_PATH,
                type=openapi.TYPE_STRING,
                format="uuid",
                required=True,
                description="UUID of the user to impersonate",
            ),
        ],
        responses={
            200: openapi.Response(
                description="Tokens for the target user",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "access": openapi.Schema(type=openapi.TYPE_STRING),
                        "refresh": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            ),
            403: openapi.Response(
                "Permission denied — the caller has the USER role, or the target "
                "account is not active"
            ),
            404: openapi.Response("User not found"),
        },
        security=[{"Bearer": []}],
        tags=["Auth"],
    )
    def get(self, request, *args, **kwargs):
        user_id = kwargs.get("user_id")

        if request.user.role == "USER":
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        user = get_user_model().objects.filter(id=user_id).first()

        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Refuse before minting, with the same shape LoginView and
        # CustomTokenRefreshView now use. The token this used to issue was
        # refused by the rest of the API anyway, so the admin got a session
        # that failed on its next request with nothing to explain it.
        if not user.is_active:
            return Response(
                {"detail": "Conta não ativada.", "code": "user_inactive"},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        from authentication.views.authentication import _set_refresh_cookie
        resp = Response({"access": str(refresh.access_token)}, status=status.HTTP_200_OK)
        _set_refresh_cookie(resp, str(refresh))
        return resp
