import logging

from django.conf import settings
from django.db import DataError, IntegrityError, OperationalError
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.debug_auth import FlexibleJWTAuthentication
from authentication.models.agents import Agents
from authentication.models.projects import Projects
from authentication.models.user_profile import UserProfile
from authentication.permissions import IsAdminByRole, is_admin_by_role
from authentication.serializers.bot_serializer import BotN8nSerializer
from authentication.serializers.default_pagination import DefaultPagination
from authentication.serializers.project_bots_association_serializer import (
    ProjectBotsAssociationSerializer,
    ProjectUsersAssociationSerializer,
)
from authentication.serializers.project_serializer import ProjectSerializer
from authentication.serializers.project_update_serializer import ProjectPartialUpdateSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    authentication_classes = [FlexibleJWTAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]

    queryset = Projects.objects.select_related("client").prefetch_related("agents").all()
    http_method_names = ["get", "post", "patch", "delete"]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["client__name"]
    search_fields = ["name", "client__name"]
    ordering_fields = ["name", "client__name"]
    ordering = ["name"]

    pagination_class = DefaultPagination

    def get_serializer_class(self):
        return (
            ProjectPartialUpdateSerializer
            if self.action == "partial_update"
            else ProjectSerializer
        )

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)

        if not user or not user.is_authenticated:
            return qs.none()

        if user.role == "ADMINISTRATOR":
            return qs  # Administrator sees all projects

        # Common users only see projects related to them
        return qs.filter(users__id=user.id).distinct()

    @swagger_auto_schema(
        operation_summary="Listar projetos",
        operation_description="Lista projetos com paginação (?page=, ?page_size=), busca (?search=) e ordenação (?ordering=).",
        manual_parameters=[
            openapi.Parameter(
                "page",
                openapi.IN_QUERY,
                description="Número da página (1..N)",
                type=openapi.TYPE_INTEGER,
            ),
            openapi.Parameter(
                "page_size",
                openapi.IN_QUERY,
                description="Itens por página (máx. 100)",
                type=openapi.TYPE_INTEGER,
            ),
            openapi.Parameter(
                "search",
                openapi.IN_QUERY,
                description="Busca por nome do projeto/cliente",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                "ordering",
                openapi.IN_QUERY,
                description="Ordenação (ex.: name, -client__name)",
                type=openapi.TYPE_STRING,
            ),
        ],
        responses={200: openapi.Response("Lista de projetos", ProjectSerializer(many=True))},
        tags=["Projects"],
        security=[{"Bearer": []}],
    )
    def list(self, request, *args, **kwargs):
        try:
            qs = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(qs)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as exc:
            logger = logging.getLogger(__name__)
            logger.exception("Error in ProjectViewSet.list")
            if getattr(settings, "DEBUG", False):
                return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            raise

    @swagger_auto_schema(
        operation_summary="Obter projeto por ID",
        operation_description="Retorna dados de um projeto específico pelo ID. Requer autenticação JWT.",
        responses={
            200: openapi.Response("Projeto encontrado", ProjectSerializer),
            404: openapi.Response("Projeto não encontrado"),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Projects"],
    )
    def retrieve(self, request, *args, **kwargs):
        try:
            project = self.get_object()
            serializer = self.get_serializer(project)
            return Response(serializer.data)
        except Exception as exc:
            logger = logging.getLogger(__name__)
            logger.exception("Error in ProjectViewSet.retrieve")
            if getattr(settings, "DEBUG", False):
                return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            raise

    @swagger_auto_schema(
        operation_summary="Criar projeto",
        operation_description="Cria um novo projeto. Requer autenticação JWT.",
        request_body=ProjectSerializer,
        responses={
            201: openapi.Response("Projeto criado com sucesso", ProjectSerializer),
            400: openapi.Response("Dados inválidos"),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Projects"],
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        read_serializer = ProjectSerializer(project)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Atualizar projeto (parcial)",
        operation_description="Atualiza parcialmente um projeto existente. Requer autenticação JWT.",
        request_body=ProjectPartialUpdateSerializer,
        responses={
            200: openapi.Response("Projeto atualizado com sucesso", ProjectSerializer),
            400: openapi.Response("Dados inválidos"),
            404: openapi.Response("Projeto não encontrado"),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Projects"],
    )
    def partial_update(self, request, *args, **kwargs):
        project = self.get_object()
        serializer = self.get_serializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(ProjectSerializer(updated).data)

    @swagger_auto_schema(
        operation_summary="Remover projeto",
        operation_description="Remove um projeto pelo ID. Requer autenticação JWT.",
        responses={
            204: openapi.Response("Projeto removido com sucesso"),
            401: openapi.Response("Não autenticado"),
            404: openapi.Response("Projeto não encontrado"),
        },
        security=[{"Bearer": []}],
        tags=["Projects"],
    )
    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @swagger_auto_schema(
        operation_summary="Listar bots do projeto",
        responses={200: BotN8nSerializer(many=True)},
        tags=["Projects"],
        security=[{"Bearer": []}],
    )
    @action(detail=True, methods=["get"], url_path="bots")
    def list_bots(self, request, pk=None):
        project = self.get_object()
        # the Projects model exposes the M2M under 'agents'
        qs = project.agents.all().order_by("name")
        return Response(BotN8nSerializer(qs, many=True).data)

    @swagger_auto_schema(
        operation_summary="Attach bot(s) to project (1 or N)",
        request_body=ProjectBotsAssociationSerializer,
        responses={200: "OK"},
        tags=["Agents/Projects"],
        security=[{"Bearer": []}],
    )
    @action(detail=True, methods=["post"], url_path="bots/attach")
    def attach_bots(self, request, pk=None):
        project = self.get_object()
        s = ProjectBotsAssociationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ids = s.validated_data["ids"]

        bots = list(Agents.objects.filter(id__in=ids))
        found_ids = {b.id for b in bots}
        missing = [str(x) for x in ids if x not in found_ids]

        already_ids = set(project.agents.filter(id__in=found_ids).values_list("id", flat=True))
        to_add_ids = found_ids - already_ids
        to_add = [b for b in bots if b.id in to_add_ids]

        if to_add:
            try:
                project.agents.add(*to_add)
            except DataError as exc:
                logger = logging.getLogger(__name__)
                logger.exception("DataError in ProjectViewSet.attach_bots")
                return Response(
                    {
                        "detail": "Dados inválidos ao anexar bot(s) ao projeto.",
                        "error": str(exc),
                        "hint": (
                            "Se aparecer 'Data too long for column', verifique se as migrations foram aplicadas "
                            "e se as colunas da tabela de associação (authentication_projects_bots) estão como CHAR(36) para UUID."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except IntegrityError as exc:
                logger = logging.getLogger(__name__)
                logger.exception("IntegrityError in ProjectViewSet.attach_bots")
                return Response(
                    {
                        "detail": "Violação de integridade ao anexar bot(s) ao projeto.",
                        "error": str(exc),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            except Exception as exc:
                logger = logging.getLogger(__name__)
                logger.exception("Unhandled error in ProjectViewSet.attach_bots")
                if getattr(settings, "DEBUG", False):
                    return Response(
                        {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                raise

        return Response(
            {
                "attached_now": [str(x) for x in to_add_ids],
                "already_attached": [str(x) for x in already_ids],
                "missing": missing,
                "count_total": project.agents.count(),
            },
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        operation_summary="Detach bot(s) from project (1 or N)",
        request_body=ProjectBotsAssociationSerializer,
        responses={200: "OK"},
        tags=["Agents/Projects"],
        security=[{"Bearer": []}],
    )
    @action(detail=True, methods=["post"], url_path="bots/detach")
    def detach_bots(self, request, pk=None):
        project = self.get_object()
        s = ProjectBotsAssociationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ids = s.validated_data["ids"]

        bots = list(Agents.objects.filter(id__in=ids))
        found_ids = {b.id for b in bots}

        attached_ids = set(project.agents.filter(id__in=found_ids).values_list("id", flat=True))
        to_remove = [b for b in bots if b.id in attached_ids]

        if to_remove:
            project.agents.remove(*to_remove)

        missing = [str(x) for x in ids if x not in found_ids]
        not_attached = [str(x) for x in (found_ids - attached_ids)]

        return Response(
            {
                "detached_now": [str(b.id) for b in to_remove],
                "not_attached": not_attached,  # existed, but were not in the project
                "missing": missing,  # don't exist in db
                "count_total": project.agents.count(),
            },
            status=status.HTTP_200_OK,
        )

    def _resolve_users_from_any_ids(self, raw_ids):
        users_direct = list(UserProfile.objects.filter(id__in=raw_ids))
        users_by_id = {u.id: u for u in users_direct}
        resolved_input_ids = set([u.id for u in users_direct])

        remaining_ids = [uid for uid in raw_ids if uid not in resolved_input_ids]
        if remaining_ids:
            profiles = list(UserProfile.objects.filter(id__in=remaining_ids))
            emails = [p.email for p in profiles if p.email]
            if emails:
                users_by_email = {u.email: u for u in UserProfile.objects.filter(email__in=emails)}
                for p in profiles:
                    u = users_by_email.get(p.email)
                    if u:
                        users_by_id.setdefault(u.id, u)
                        resolved_input_ids.add(p.id)

        missing = [str(uid) for uid in raw_ids if uid not in resolved_input_ids]

        return list(users_by_id.values()), resolved_input_ids, missing

    @swagger_auto_schema(
        operation_summary="Attach user(s) to project (1 or N)",
        request_body=ProjectUsersAssociationSerializer,
        responses={200: "OK"},
        tags=["Users/Projects"],
        security=[{"Bearer": []}],
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="users/attach",
        permission_classes=[IsAuthenticated, IsAdminByRole],  # admin restriction kept
        # Keep both JWT + Flexible to mirror viewset default and avoid auth inconsistency
        authentication_classes=[FlexibleJWTAuthentication, JWTAuthentication],
    )
    def attach_users(self, request, pk=None):
        if not is_admin_by_role(request.user):
            return Response(
                {"detail": "Only administrators can attach users to projects."},
                status=status.HTTP_403_FORBIDDEN,
            )

        project = self.get_object()
        s = ProjectUsersAssociationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ids = s.validated_data["ids"]

        users_to_add, _, missing = self._resolve_users_from_any_ids(ids)

        resolved_ids = {u.id for u in users_to_add}
        existing_ids = set(project.users.values_list("id", flat=True))

        to_add_ids = resolved_ids - existing_ids
        already_ids = resolved_ids & existing_ids

        cross_client_ids = []
        if to_add_ids:
            for u in users_to_add:
                if (
                    u.id in to_add_ids
                    and getattr(u, "client_id", None)
                    and getattr(project, "client_id", None)
                ):
                    if u.client_id != project.client_id:
                        cross_client_ids.append(u.id)

            if cross_client_ids:
                to_add_ids = to_add_ids - set(cross_client_ids)

            to_add = [u for u in users_to_add if u.id in to_add_ids]
            try:
                project.users.add(*to_add)
            except DataError as exc:
                logger = logging.getLogger(__name__)
                logger.exception("DataError in ProjectViewSet.attach_users")
                return Response(
                    {
                        "detail": "Dados inválidos ao anexar usuário(s) ao projeto.",
                        "error": str(exc),
                        "hint": (
                            "Verifique se as migrations foram aplicadas e se a tabela M2M de usuários usa CHAR(36) para UUID."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except IntegrityError as exc:
                logger = logging.getLogger(__name__)
                logger.exception("IntegrityError in ProjectViewSet.attach_users")
                return Response(
                    {
                        "detail": "Violação de integridade ao anexar usuário(s) ao projeto.",
                        "error": str(exc),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            except OperationalError as exc:
                logger = logging.getLogger(__name__)
                logger.exception("OperationalError in ProjectViewSet.attach_users")
                msg = str(exc)
                if "Cross-client" in msg:
                    return Response(
                        {
                            "detail": "Associação usuário/projeto bloqueada por política de isolamento de clientes.",
                            "error": msg,
                            "hint": "Garanta que o usuário pertence ao mesmo client do projeto.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if getattr(settings, "DEBUG", False):
                    return Response({"detail": msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                raise
            except Exception as exc:
                logger = logging.getLogger(__name__)
                logger.exception("Unhandled error in ProjectViewSet.attach_users")
                if getattr(settings, "DEBUG", False):
                    return Response(
                        {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                raise

        return Response(
            {
                "attached_now": [str(x) for x in to_add_ids],
                "already_attached": [str(x) for x in already_ids],
                "missing": missing,
                "rejected_cross_client": [str(x) for x in cross_client_ids],
                "count_total": project.users.count(),
            },
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        operation_summary="Detach user(s) from project (1 or N)",
        request_body=ProjectUsersAssociationSerializer,
        responses={200: "OK"},
        tags=["Users/Projects"],
        security=[{"Bearer": []}],
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="users/detach",
        permission_classes=[IsAuthenticated, IsAdminByRole],
        authentication_classes=[FlexibleJWTAuthentication, JWTAuthentication],
    )
    def detach_users(self, request, pk=None):
        if not is_admin_by_role(request.user):
            return Response(
                {"detail": "Only administrators can detach users from projects."},
                status=status.HTTP_403_FORBIDDEN,
            )

        project = self.get_object()
        s = ProjectUsersAssociationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ids = s.validated_data["ids"]

        users_to_consider, resolved_input_ids, missing = self._resolve_users_from_any_ids(ids)

        attached_ids = set(
            project.users.filter(id__in=[u.id for u in users_to_consider]).values_list(
                "id", flat=True
            )
        )
        to_remove = [u for u in users_to_consider if u.id in attached_ids]

        if to_remove:
            try:
                project.users.remove(*to_remove)
            except DataError as exc:
                logger = logging.getLogger(__name__)
                logger.exception("DataError in ProjectViewSet.detach_users")
                return Response(
                    {
                        "detail": "Dados inválidos ao remover usuário(s) do projeto.",
                        "error": str(exc),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except IntegrityError as exc:
                logger = logging.getLogger(__name__)
                logger.exception("IntegrityError in ProjectViewSet.detach_users")
                return Response(
                    {
                        "detail": "Violação de integridade ao remover usuário(s) do projeto.",
                        "error": str(exc),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            except Exception as exc:
                logger = logging.getLogger(__name__)
                logger.exception("Unhandled error in ProjectViewSet.detach_users")
                if getattr(settings, "DEBUG", False):
                    return Response(
                        {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                raise

        not_attached = [str(u.id) for u in users_to_consider if u.id not in attached_ids]

        return Response(
            {
                "detached_now": [str(u.id) for u in to_remove],
                "not_attached": not_attached,
                "missing": missing,
                "count_total": project.users.count(),
            },
            status=status.HTTP_200_OK,
        )
