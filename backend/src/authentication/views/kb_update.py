import logging

import requests
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)
from authentication.models.projects import Projects
from authentication.permissions import assert_user_project_access


class KBFileUpdateProxyView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    target_add = "/webhook/kb/file/add"
    target_del = "/webhook/webhook/kb/file/delete"
    target_list = "/webhook/webhook/kb/file/list"
    permission_classes = [IsAuthenticated]

    def _headers(self):
        return {"key": settings.N8N_KB_KEY}

    @swagger_auto_schema(
        tags=["kb"],
        operation_id="kb_file_update",
        summary="Troca um arquivo do KB (add novo + delete antigo)",
        description="Recebe file (novo) e hash_id (identifica o KB). O backend encontra o arquivo antigo, adiciona o novo e remove o antigo.",
        manual_parameters=[
            openapi.Parameter("hash_id", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("file", openapi.IN_FORM, type=openapi.TYPE_FILE, required=True),
            openapi.Parameter(
                "project_id", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True
            ),
        ],
        consumes=["multipart/form-data"],
        responses={200: openapi.Response(description="OK")},
    )
    def patch(self, request):
        hash_id = request.data.get("hash_id")
        old_file = request.data.get("old_file", None)
        project_id = request.data.get("project_id")
        upload = request.data.get("file")

        if not all([hash_id, upload, project_id]):
            return Response(
                {"detail": "hash_id, file, project_id são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from authentication.models.kb import KBLink

        # Enforce project access (tenant isolation)
        try:
            project = Projects.objects.get(pk=project_id)
        except Projects.DoesNotExist:
            return Response({"detail": "Projeto não encontrado."}, status=404)
        assert_user_project_access(request.user, project)

        if not KBLink.objects.filter(project_id=project_id, external_id=hash_id).exists():
            return Response({"detail": "KB não pertence ao projeto"}, status=403)

        if not old_file:
            try:
                list_url = f"{settings.N8N_BASE_URL}{self.target_list}"
                list_resp = requests.get(
                    list_url,
                    headers={
                        "key": settings.N8N_KB_KEY,
                        "Content-Type": "application/json",
                    },
                    json={"hash_id": hash_id},
                    timeout=15,
                )
                if list_resp.status_code < 300:
                    try:
                        list_json = list_resp.json()
                    except ValueError:
                        list_json = None

                    discovered = None
                    if isinstance(list_json, dict):
                        if "file" in list_json and list_json.get("file"):
                            discovered = list_json.get("file")
                        elif "files" in list_json and isinstance(
                            list_json.get("files"), (list, tuple)
                        ):
                            files = list_json.get("files")
                            if files:
                                first = files[0]
                                if isinstance(first, dict) and "file" in first:
                                    discovered = first.get("file")
                                elif isinstance(first, str):
                                    discovered = first
                    elif isinstance(list_json, (list, tuple)) and list_json:
                        first = list_json[0]
                        if isinstance(first, dict) and "file" in first:
                            discovered = first.get("file")
                        elif isinstance(first, str):
                            discovered = first

                    if discovered:
                        old_file = discovered
            except requests.RequestException:
                logger.exception(
                    "Failed to query n8n for existing KB files; proceeding without old_file"
                )

        try:
            add_url = f"{settings.N8N_BASE_URL}{self.target_add}"
            files = {
                "file": (
                    upload.name,
                    upload.file,
                    getattr(upload, "content_type", "application/octet-stream"),
                )
            }
            add_resp = requests.post(
                add_url,
                headers=self._headers(),
                files=files,
                data={"hash_id": hash_id},
                timeout=30,
            )
            add_json = add_resp.json()
            if add_resp.status_code >= 300:
                return Response(
                    {"step": "add", "status": add_resp.status_code, "payload": add_json},
                    status=add_resp.status_code,
                )
        except Exception as e:
            return Response({"detail": f"Falha no add: {e}"}, status=502)

        del_resp = None
        del_json = None
        if old_file:
            try:
                del_url = f"{settings.N8N_BASE_URL}{self.target_del}"
                del_resp = requests.delete(
                    del_url,
                    headers={**self._headers(), "Content-Type": "application/json"},
                    json={"hash_id": hash_id, "file": old_file},
                    timeout=15,
                )
                del_json = (
                    del_resp.json()
                    if del_resp.headers.get("Content-Type", "").startswith("application/json")
                    else {"raw": del_resp.text}
                )
                if del_resp.status_code >= 300:
                    return Response(
                        {
                            "detail": "Novo arquivo adicionado, mas não removi o antigo",
                            "add": add_json,
                            "delete": del_json,
                        },
                        status=207,
                    )
            except Exception as e:
                return Response(
                    {
                        "detail": "Novo arquivo adicionado, mas falhou ao remover o antigo",
                        "add": add_json,
                        "delete_error": str(e),
                    },
                    status=207,
                )

        return Response({"status": "ok", "added": add_json, "deleted": del_json}, status=200)
