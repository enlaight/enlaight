import uuid
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from django.shortcuts import get_object_or_404
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
        operation_summary="List all boards for Dashboard Page",
        operation_description="Lista all boards. Required JWT auth.",
        responses={
            200: openapi.Response("Layouts list", BoardSerializer(many=True))
        },
        security=[{"Bearer": []}],
        tags=["Boards"],
    )
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_summary="Creates dashboard",
        operation_description="Creates dashboard for a project. Admin only. Requires JWT auth.",
        responses={
            201: openapi.Response("Dashboard created", BoardSerializer),
            400: openapi.Response("Invalid data"),
            403: openapi.Response("Unauthorized"),
            404: openapi.Response("Project not found"),
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
        config = request.data.get("config", "[]")
        board = Boards.objects.create(config=config, project=project, client=project.client)
        return Response(self.get_serializer(board).data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Atualizar dashboard",
        operation_description="Atualiza uma dashboard. Requires JWT auth.",
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
        config = request.data.get("config")
        project_id = request.data.get("projectId")

        if not config:
            return Response(
                {"detail": "config field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not project_id:
            return Response(
                {"detail": "projectId is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            project_uuid = uuid.UUID(str(project_id).strip())
        except (ValueError, AttributeError):
            return Response(
                {"detail": "Invalid projectId."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        board = get_object_or_404(Boards, project_id=project_uuid)

        serializer = BoardUpdateSerializer(board, data={"config": config}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(self.get_serializer(board).data, status=status.HTTP_200_OK)
