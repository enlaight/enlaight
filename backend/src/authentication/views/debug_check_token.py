from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken, TokenError


@api_view(["POST"])
@permission_classes([AllowAny])
def debug_check_token(request):
    token = (request.data or {}).get("token")
    if not token:
        return Response({"detail": "token required"}, status=status.HTTP_400_BAD_REQUEST)

    # Try to decode as access token
    try:
        at = AccessToken(token)
        return Response({"type": "access", "payload": dict(at.payload)}, status=200)
    except Exception as e:
        access_err = str(e)

    # Try refresh
    try:
        rt = RefreshToken(token)
        return Response({"type": "refresh", "payload": dict(rt.payload)}, status=200)
    except Exception as e:
        refresh_err = str(e)

    return Response(
        {"detail": "invalid", "access_error": access_err, "refresh_error": refresh_err}, status=400
    )
