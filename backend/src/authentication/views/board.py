from django.contrib.auth import get_user_model
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.models.boards import Boards
from authentication.models.clients import Clients
from authentication.models.projects import Projects
from authentication.serializers.board_serializer import BoardSerializer
from authentication.serializers.board_update_serializer import BoardUpdateSerializer
from authentication.serializers.user_profile import UserProfileSerializer


class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    queryset = Boards.objects.all()
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    http_method_names = ["get", "put"]

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

        User = get_user_model()
        try:
            user = User.objects.get(id=request.user.id)
        except Exception as e:
            print(e)
            return Response(
                {"status": "Error: User not found", "detail": e},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # User of permission level "admin" can access all boards
        user_role = user.role

        # Else user can only access the boards belonging to their client and projects
        user_client = user.client_id
        projects = [p.id for p in user.projects.all()]
        queryset = Boards.objects.filter(project_id__in=projects)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_summary="Atualizar dashboard",
        operation_description="Atualiza uma dashboard. Requer autenticação JWT.",
        request_body=BoardUpdateSerializer,
        responses={
            200: openapi.Response("Dashboard atualizada", BoardSerializer),
            400: openapi.Response("Dados inválidos"),
            404: openapi.Response("Dados não encontrados"),
        },
        security=[{"Bearer": []}],
        tags=["Boards"],
    )
    def update(self, request, *args, **kwargs):
        try:
            data = request.data.get("data")
            if not data:
                return Response(
                    {"detail": "Dados são obrigatórios."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            project_id = data.get("project_id")
            client_id = data.get("client_id")

            boards = Boards.objects.filter()
            if not boards:
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                new_boards = serializer.save()
                return Response(
                    self.get_serializer(new_boards).data, status=status.HTTP_201_CREATED
                )

            serializer = self.get_serializer(boards, data=request.data)
            serializer.is_valid(raise_exception=True)
            updated_boards = serializer.save()
        except Exception as e:
            print(e)
            return Response(
                {"detail": e},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self.get_serializer(updated_boards).data, status=200)
