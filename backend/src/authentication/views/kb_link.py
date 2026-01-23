from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models.kb import KBLink
from authentication.models.projects import Projects
from authentication.permissions import assert_user_project_access
from authentication.serializers.kb_link_serializer import KBLinkSerializer


class KBLinkAttachView(APIView):
    """
    Associa uma KB já existente (hash_id) a um projeto, criando o vínculo local (KBLink).
    Não cria KB no n8n, apenas registra a associação para controle de acesso.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        tags=["kb"],
        operation_id="kb_attach",
        summary="Vincula (attach) uma KB existente a um projeto",
        description=(
            "Cria o vínculo local entre um projeto e uma KB externa (hash_id).\n"
            "Passe o project_id via query string (?project_id=<uuid>) e o hash_id no corpo.\n"
            "Apenas usuários com acesso ao projeto (ou admins/superusers) podem executar."
        ),
        manual_parameters=[
            openapi.Parameter(
                name="project_id",
                in_=openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                required=True,
                description="UUID do projeto ao qual a KB será vinculada",
            )
        ],
        request_body=KBLinkSerializer,
        responses={
            200: openapi.Response(
                description="Vínculo criado ou já existente.",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, additional_properties=True),
            )
        },
    )
    def post(self, request):
        ser = KBLinkSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response({"detail": "project_id é obrigatório na query."}, status=400)
        hash_id = ser.validated_data["hash_id"]
        name = ser.validated_data.get("name", "")

        try:
            project = Projects.objects.get(pk=project_id)
        except Projects.DoesNotExist:
            return Response({"detail": "Projeto não encontrado."}, status=404)

        # Tenant isolation: non-admins must have access to the project
        assert_user_project_access(request.user, project)

        link, created = KBLink.objects.get_or_create(
            project_id=project.id,
            external_id=hash_id,
            defaults={"name": name or ""},
        )
        return Response(
            {
                "status": "created" if created else "exists",
                "project_id": str(project.id),
                "hash_id": hash_id,
                "name": link.name,
            },
            status=status.HTTP_200_OK,
        )
