from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.models.boards import Boards
from authentication.models.projects import Projects
from authentication.models.roles import UserRole
from authentication.serializers.board_serializer import BoardSerializer
from authentication.serializers.board_update_serializer import BoardUpdateSerializer


class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    queryset = Boards.objects.all()
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    http_method_names = ["get", "post", "patch"]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.ADMINISTRATOR.value:
            return Boards.objects.all()
        return Boards.objects.filter(project__in=user.projects.all())

    @swagger_auto_schema(
        operation_summary="Listar todos os charts da Dashboard",
        operation_description="Lista todos os charts da Dashboard. Requer autenticação JWT.",
        responses={
            200: openapi.Response("Listas e Posições de Charts", BoardSerializer(many=True))
        },
        security=[{"Bearer": []}],
        tags=["Boards"],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Criar dashboard",
        operation_description="Cria uma dashboard para um projeto. Apenas administradores. Requer autenticação JWT.",
        responses={
            201: openapi.Response("Dashboard criada", BoardSerializer),
            400: openapi.Response("Dados inválidos"),
            403: openapi.Response("Sem permissão"),
            404: openapi.Response("Projeto não encontrado"),
        },
        security=[{"Bearer": []}],
        tags=["Boards"],
    )
    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != UserRole.ADMINISTRATOR.value:
            return Response(
                {"detail": "Only administrators can create boards."},
                status=status.HTTP_403_FORBIDDEN,
            )
        project_id = request.data.get("project_id")
        if not project_id:
            return Response(
                {"detail": "project_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            project = Projects.objects.get(id=project_id)
        except Projects.DoesNotExist:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        board = Boards.objects.create(config="[]", project=project, client=project.client)
        return Response(self.get_serializer(board).data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Atualizar dashboard",
        operation_description="Atualiza uma dashboard. Requer autenticação JWT.",
        request_body=BoardUpdateSerializer,
        responses={
            200: openapi.Response("Dashboard atualizada", BoardSerializer),
            400: openapi.Response("Dados inválidos"),
            404: openapi.Response("Dados não encontrados"),
        },
        # security=[{"Bearer": []}],
        tags=["Boards"],
    )
    def partial_update(self, request, *args, **kwargs):
        try:
            board = self.get_object()
            config = request.data.get("config")
            if not config:
                return Response(
                    {"detail": "config field is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = BoardUpdateSerializer(board, data={"config": config}, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except Exception as e:
            print(e)
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self.get_serializer(board).data, status=status.HTTP_200_OK)
