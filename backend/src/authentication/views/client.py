from uuid import UUID

from django.db.models import Count
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from authentication.models.clients import Clients
from authentication.serializers.client_serializer import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    queryset = Clients.objects.all()
    permission_classes = []
    queryset = Clients.objects.all().order_by("name")
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)

        if not user or not user.is_authenticated:
            return qs.none()

        if user.role == "ADMINISTRATOR":
            return qs  # Administrator sees all clients

        # Common users only see clients related to them
        return qs.filter(user_profiles__id=user.id).distinct()

    @swagger_auto_schema(
        operation_summary="Listar clientes",
        operation_description="Lista todos os clientes com o número de projetos associados. Requer autenticação JWT.",
        responses={
            200: openapi.Response("Lista de clientes", ClientSerializer(many=True)),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Clients"],
    )
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        queryset = qs.annotate(num_projects=Count("projects"))
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_summary="Obter cliente por ID",
        operation_description="Retorna os dados de um cliente específico pelo ID. Requer autenticação JWT.",
        responses={
            200: openapi.Response("Cliente encontrado", ClientSerializer),
            400: openapi.Response("Token malformado ou inválido"),
            404: openapi.Response("Cliente não encontrado"),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Clients"],
    )
    def retrieve(self, request, *args, **kwargs):
        try:
            UUID(str(kwargs["pk"]))
        except ValueError:
            return Response(
                {"detail": "O ID fornecido não é um UUID válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client = Clients.objects.filter(id=kwargs["pk"])

        if not client.exists():
            return Response(
                {"detail": "Cliente não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(client.first())
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_summary="Criar novo cliente",
        operation_description="Cria um novo cliente no sistema. Requer autenticação JWT.",
        request_body=ClientSerializer,
        responses={
            201: openapi.Response("Cliente criado com sucesso", ClientSerializer),
            400: openapi.Response("Cliente já existe"),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Clients"],
    )
    def create(self, request, *args, **kwargs):
        try:
            name = request.data.get("name")

            if Clients.objects.filter(name__iexact=name).exists():
                return Response(
                    {"detail": "Cliente com este nome já existe."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            client = Clients.objects.create(name=name)
            serializer = self.get_serializer(client)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(e)
            return Response({"status": "error", "details": e}, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Atualizar parcialmente um cliente",
        operation_description="Atualiza parcialmente os dados de um cliente. Requer autenticação JWT.",
        request_body=ClientSerializer,
        responses={
            200: openapi.Response("Cliente atualizado com sucesso", ClientSerializer),
            400: "Requisição inválida",
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Clients"],
    )
    def partial_update(self, request, *args, **kwargs):
        try:
            UUID(str(kwargs["pk"]))
        except ValueError:
            return Response(
                {"detail": "O ID fornecido não é um UUID válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = Clients.objects.filter(id=kwargs["pk"])
            if not client.exists():
                return Response(
                    {"detail": "Cliente não encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            serializer = self.get_serializer(client.first(), data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except Exception as e:
            print(e)
            return Response({"status": "error", "details": e})

    @swagger_auto_schema(
        operation_summary="Remover cliente",
        operation_description="Remove um cliente pelo ID. Requer autenticação JWT.",
        responses={
            204: openapi.Response("Cliente removido com sucesso"),
            400: openapi.Response("ID inválido ou requisição malformada"),
            401: openapi.Response("Não autenticado"),
            404: openapi.Response("Cliente não encontrado"),
        },
        security=[{"Bearer": []}],
        tags=["Clients"],
    )
    def destroy(self, request, *args, **kwargs):
        client_id = kwargs.get("pk")

        try:
            UUID(str(client_id))
        except ValueError:
            return Response(
                {"detail": "O ID fornecido não é um UUID válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = Clients.objects.filter(id=client_id).first()
            if not client:
                return Response(
                    {"detail": "Cliente não encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            client.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            print(e)
            return Response({"status": "error", "details": e})
