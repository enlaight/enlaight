from typing import Dict

import requests
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import assert_user_kb_access
from authentication.serializers.kb_file_add_serializer import KBFileAddSerializer


class KBFileAddProxyView(APIView):
    target_path = "/webhook/kb/file/add"
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def _build_headers(self) -> Dict[str, str]:
        return {"key": settings.N8N_KB_KEY}

    @swagger_auto_schema(
        tags=["kb"],
        operation_id="kb_file_add",
        summary="Adiciona arquivo ao KB (proxy n8n)",
        description="Envia `file` (upload) e `hash_id` para o webhook do n8n.",
        request_body=KBFileAddSerializer,
        consumes=["multipart/form-data"],
        responses={
            200: openapi.Response(
                description="OK",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, additional_properties=True),
            )
        },
    )
    def post(self, request, *args, **kwargs):
        ser = KBFileAddSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        upload = ser.validated_data["file"]
        hash_id = ser.validated_data["hash_id"]

        assert_user_kb_access(request.user, hash_id)  # may raise PermissionDenied

        if not settings.N8N_BASE_URL or not settings.N8N_KB_KEY:
            return Response(
                {"detail": "Configuração do N8N ausente (N8N_BASE_URL/N8N_KB_KEY)."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        files = {
            "file": (
                upload.name,
                upload.file,
                getattr(upload, "content_type", "application/octet-stream"),
            ),
        }
        data = {"hash_id": hash_id}

        # chama n8n
        url = f"{settings.N8N_BASE_URL}{self.target_path}"
        timeout = int(getattr(settings, "N8N_TIMEOUT", 30))

        try:
            upstream = requests.post(
                url,
                headers=self._build_headers(),
                files=files,
                data=data,
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
