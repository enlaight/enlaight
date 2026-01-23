from typing import Any, Dict

import requests
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models.kb import KBLink
from authentication.models.projects import Projects
from authentication.permissions import assert_user_project_access
from authentication.serializers.kb_create_serializer import KBCreateSerializer


class KBCreateProxyView(APIView):
    """
    Proxy para o n8n: POST /webhook/kb/create/
    Envia name + description no body JSON.
    """

    permission_classes = [IsAuthenticated]

    target_path = "/webhook/kb/create/"

    def _build_headers(self) -> Dict[str, str]:
        return {
            "key": getattr(settings, "N8N_KB_CREATE_KEY", settings.N8N_KB_KEY),
            "Content-Type": "application/json",
        }

    @swagger_auto_schema(
        tags=["kb"],
        operation_id="kb_create",
        summary="Cria um KB (proxy n8n)",
        description="Recebe `name` e `description` e encaminha para o webhook do n8n.",
        request_body=KBCreateSerializer,
        responses={
            200: openapi.Response(
                description="KB criado",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, additional_properties=True),
            )
        },
    )
    def post(self, request, *args, **kwargs):
        ser = KBCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            project = Projects.objects.get(pk=ser.validated_data["project_id"])
        except Projects.DoesNotExist:
            return Response({"detail": "Projeto não encontrado."}, status=404)
        assert_user_project_access(request.user, project)

        payload_n8n = {
            "name": ser.validated_data["name"],
            "description": ser.validated_data.get("description", ""),
        }

        if not settings.N8N_BASE_URL or not self._build_headers().get("key"):
            return Response(
                {"detail": "Configuração do N8N ausente (N8N_BASE_URL/N8N_KB_KEY)."}, status=500
            )

        url = f"{settings.N8N_BASE_URL}{self.target_path}"
        try:
            upstream = requests.post(
                url, headers=self._build_headers(), json=payload_n8n, timeout=10
            )
            data = upstream.json()
        except requests.Timeout:
            return Response({"detail": "Timeout ao chamar serviço externo."}, status=504)
        except (requests.RequestException, ValueError) as e:
            return Response({"detail": f"Erro ao chamar serviço externo: {e}"}, status=502)

        ext_id = (
            data.get("hash_id")
            or data.get("id")
            or (data.get("data") or {}).get("hash_id")
            or (data.get("kb") or {}).get("id")
        )
        if not ext_id:
            return Response({"detail": "Resposta do n8n sem identificador do KB."}, status=502)

        KBLink.objects.get_or_create(
            project_id=project.id,
            external_id=ext_id,
            defaults={"name": payload_n8n["name"]},
        )

        return Response(
            {"project_id": str(project.id), **data},
            status=upstream.status_code,
        )
