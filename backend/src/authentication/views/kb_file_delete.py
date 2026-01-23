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
from authentication.serializers.kb_file_delete_serializer import KBFileDeleteSerializer


class KBFileDeleteProxyView(APIView):
    """
    Proxy para o n8n: DELETE /webhook/webhook/kb/file/delete
    Envia JSON com hash_id e file.
    """

    permission_classes = [IsAuthenticated]

    target_path = "/webhook/webhook/kb/file/delete"

    def _build_headers(self) -> Dict[str, str]:
        return {
            "key": settings.N8N_KB_KEY,
            "Content-Type": "application/json",
        }

    @swagger_auto_schema(
        tags=["kb"],
        operation_id="kb_file_delete",
        summary="Remove um arquivo do KB (proxy n8n)",
        description="Deleta o arquivo `file` do KB identificado por `hash_id`.",
        request_body=KBFileDeleteSerializer,
        responses={
            200: openapi.Response(
                description="Arquivo removido do KB",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, additional_properties=True),
            )
        },
    )
    def delete(self, request, *args, **kwargs):
        payload: Dict[str, Any] = {}
        if isinstance(request.data, dict) and request.data:
            ser = KBFileDeleteSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            payload = ser.validated_data
        else:
            q = {
                "hash_id": request.query_params.get("hash_id"),
                "file": request.query_params.get("file"),
            }
            ser = KBFileDeleteSerializer(data=q)
            ser.is_valid(raise_exception=True)
            payload = ser.validated_data

        assert_user_kb_access(request.user, payload["hash_id"])  # may raise PermissionDenied

        if not settings.N8N_BASE_URL or not settings.N8N_KB_KEY:
            return Response(
                {"detail": "Configuração do N8N ausente (N8N_BASE_URL/N8N_KB_KEY)."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        url = f"{settings.N8N_BASE_URL}{self.target_path}"
        timeout = int(getattr(settings, "N8N_TIMEOUT", 10))
        try:
            upstream = requests.delete(
                url,
                headers=self._build_headers(),
                json=payload,
                timeout=timeout,
            )
        except requests.Timeout:
            return Response(
                {"detail": "Timeout ao chamar serviço externo."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except requests.RequestException as e:
            return Response(
                {"detail": f"Erro ao chamar serviço externo: {str(e)}"},
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
