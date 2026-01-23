from typing import Any, Dict, List

import requests
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models.kb import KBLink
from authentication.models.projects import Projects
from authentication.permissions import is_admin_by_role


def _as_bool(value: str) -> bool:
    return str(value).lower() in {"1", "true", "t", "yes", "y"}


class KBListAllProxyView(APIView):
    """
    Lista KBs do n8n, mas **só** retorna as que estão vinculadas ao projeto informado.
    Não realiza sincronização local; retorna apenas a lista filtrada pelo projeto.
    """

    permission_classes = [IsAuthenticated]

    target_path = "/webhook/kb/list-all"

    def _build_headers(self) -> Dict[str, str]:
        return {
            "key": settings.N8N_KB_KEY,
            "Content-Type": "application/json",
        }

    @swagger_auto_schema(
        tags=["kb"],
        operation_id="kb_list_all",
        summary="Lista KBs do projeto (proxy + filtro local)",
        description=(
            "Exige `project_id` e retorna apenas KBs vinculadas a esse projeto. "
            "Retorna apenas KBs vinculadas ao projeto informado."
        ),
        manual_parameters=[
            openapi.Parameter(
                "project_id",
                openapi.IN_QUERY,
                description="UUID do projeto",
                type=openapi.TYPE_STRING,
                required=True,
            )
        ],
        responses={
            200: openapi.Response(
                description="OK",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, additional_properties=True),
            )
        },
    )
    def get(self, request, *args, **kwargs):
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response({"detail": "project_id é obrigatório."}, status=400)

        try:
            project = Projects.objects.get(pk=project_id)
        except Projects.DoesNotExist:
            return Response({"detail": "Projeto não encontrado."}, status=404)

        if not (request.user and (request.user.is_superuser or is_admin_by_role(request.user))):
            if project not in request.user.projects.all():
                raise PermissionDenied("Você não tem acesso a este projeto.")

        if not getattr(settings, "N8N_BASE_URL", None) or not getattr(
            settings, "N8N_KB_KEY", None
        ):
            return Response(
                {"detail": "Configuration error: N8N_BASE_URL or N8N_KB_KEY not set."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        url = f"{settings.N8N_BASE_URL}{self.target_path}"
        timeout = int(getattr(settings, "N8N_TIMEOUT", 10))
        try:
            upstream = requests.get(url, headers=self._build_headers(), timeout=timeout)
            upstream.raise_for_status()
        except requests.Timeout:
            return Response({"detail": "Timeout."}, status=504)
        except requests.RequestException as e:
            return Response({"detail": f"Error calling external service: {e}"}, status=502)

        try:
            payload = upstream.json()
        except ValueError:
            return Response({"raw": upstream.text}, status=upstream.status_code)

        rows: List[Dict[str, Any]] = payload.get("kbs") or payload.get("data") or []
        normalized: List[Dict[str, Any]] = []
        for r in rows:
            ext_id = r.get("hash_id") or r.get("id") or r.get("external_id")
            name = r.get("name") or r.get("kb_name") or ""
            if not ext_id:
                continue
            normalized.append({"external_id": ext_id, "name": name, **r})

        # admins (by role) and superusers see all KBs; other users see only KBs linked to the project
        # if is_admin_by_role(request.user) or (request.user and request.user.is_superuser):
        #     filtered = normalized
        # else:
        allowed = set(KBLink.objects.filter(project=project).values_list("external_id", flat=True))
        filtered = [i for i in normalized if i["external_id"] in allowed]

        return Response(
            {
                "status": "success",
                "project_id": str(project.id),
                "count": len(filtered),
                "kbs": filtered,
            },
            status=200,
        )
