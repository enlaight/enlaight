from typing import Any, Dict

import requests
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import assert_user_kb_access
from authentication.serializers.kg_get_serializer import KBGetQuerySerializer


class KBGetProxyView(APIView):
    permission_classes = [IsAuthenticated]
    target_path = "/webhook/kb/get/"

    def _build_headers(self) -> Dict[str, str]:
        return {
            "key": settings.N8N_KB_KEY,
            "Content-Type": "application/json",
        }

    @swagger_auto_schema(
        tags=["kb"],
        operation_id="kb_get_list",
        summary="Proxy para n8n KB Get",
        description="Recebe `hash_id` como query param e consulta o n8n.",
        query_serializer=KBGetQuerySerializer,
        responses={
            200: openapi.Response(
                description="OK",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, additional_properties=True),
            )
        },
    )
    def get(self, request, *args, **kwargs):
        ser = KBGetQuerySerializer(data=request.query_params)
        has_query = ser.is_valid()

        payload: Dict[str, Any] = {}
        if has_query:
            payload = {"hash_id": ser.validated_data["hash_id"]}
        elif isinstance(request.data, dict) and "hash_id" in request.data:
            payload = {"hash_id": request.data.get("hash_id")}

        if not settings.N8N_BASE_URL or not settings.N8N_KB_KEY:
            return Response(
                {"detail": "Configuration error: N8N_BASE_URL or N8N_KB_KEY not set."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if "hash_id" not in payload or not payload["hash_id"]:
            return Response(
                {"detail": "Parameter 'hash_id' is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce tenant isolation for the KB
        assert_user_kb_access(request.user, payload["hash_id"])  # may raise PermissionDenied

        url = f"{settings.N8N_BASE_URL}{self.target_path}"
        timeout = int(getattr(settings, "N8N_TIMEOUT", 10))
        try:
            upstream = requests.get(
                url, headers=self._build_headers(), json=payload, timeout=timeout
            )
        except requests.Timeout:
            return Response({"detail": "Timeout."}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except requests.RequestException as e:
            return Response(
                {"detail": f"Error calling external service: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            return Response(upstream.json(), status=upstream.status_code)
        except ValueError:
            return Response(
                {"raw": upstream.text},
                status=upstream.status_code,
                content_type=upstream.headers.get("Content-Type", "application/json"),
            )
