from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from datetime import datetime

from authentication.models.agents import Agents
from authentication.models.chat_sessions import ChatSession
from authentication.permissions import IsAdminByRole, IsAdminOrRelatedToBot, is_admin_by_role
from authentication.serializers.bot_serializer import BotN8nSerializer
from authentication.serializers.bot_update_serializer import (
    BotExpertiseOnlySerializer,
    BotPartialUpdateSerializer,
)
from authentication.serializers.default_pagination import DefaultPagination

from pprint import pprint

class BotViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    queryset = Agents.objects.all().order_by("name")
    serializer_class = BotN8nSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = {}
    search_fields = ["name", "description", "url_n8n"]
    pagination_class = DefaultPagination
    http_method_names = ["get", "post", "patch", "delete"]

    def get_permissions(self):
        if self.action in {"create", "partial_update", "update", "destroy", "expertise"}:
            return [IsAuthenticated(), IsAdminByRole()]
        if self.action == "retrieve":
            return [IsAuthenticated(), IsAdminOrRelatedToBot()]
        return [IsAuthenticated()]

    def get_queryset(self):
        # Avoid prefetch_related("projects") here because in some DB states
        # the join table name differs (authentication_projects_agents vs
        # authentication_projects_agents) and prefetching triggers SQL that
        # references the missing table, causing a ProgrammingError (1146).
        # As a safe hotfix, don't prefetch; this avoids the error and still
        # returns correct results (with a small perf tradeoff).
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)

        if not user or not user.is_authenticated:
            return qs.none()

        if is_admin_by_role(user):
            return qs

        return qs.filter(projects__users__id=user.id).distinct()

    def get_serializer_class(self):
        if self.action == "create":
            from authentication.serializers.bot_create_serializer import BotCreateSerializer

            return BotCreateSerializer
        if self.action in ("partial_update", "update"):
            return BotPartialUpdateSerializer
        if self.action == "expertise":
            return BotExpertiseOnlySerializer
        return BotN8nSerializer

    @swagger_auto_schema(
        operation_summary="List bots",
        manual_parameters=[
            openapi.Parameter(
                "page",
                openapi.IN_QUERY,
                type=openapi.TYPE_INTEGER,
                description="Page number (1..N)",
            ),
            openapi.Parameter(
                "page_size",
                openapi.IN_QUERY,
                type=openapi.TYPE_INTEGER,
                description="Items per page",
            ),
            openapi.Parameter(
                "search",
                openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                description="Search across name/description/url_n8n",
            ),
        ],
        responses={200: openapi.Response("List of bots", BotN8nSerializer(many=True))},
        tags=["Agents"],
    )
    def list(self, request, *args, **kwargs):
        user = request.user
        user_sessions = ChatSession.objects.filter(user=user)
        sessions_objects = {us.agent_id: [] for us in user_sessions}
        for us in user_sessions:
            sessions_objects[us.agent_id].append({
                "id": str(us.id),
                "session_key": str(us.session_key),
                "agent_id": str(us.agent_id),
                "user_id": str(us.user_id),
                "data": us.data
            })

        if is_admin_by_role(user):
            qs = self.filter_queryset(self.get_queryset())

            serialized_data = self.get_serializer(qs, many=True).data
            return_data = []
            for obj in serialized_data:
                obj['chat_sessions'] = [{
                    "id": str(us.id),
                    "session_key": str(us.session_key),
                    "agent_id": str(us.agent_id),
                    "user_id": str(us.user_id),
                    "data": us.data,
                    "created_at": us.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z")
                } for us in user_sessions if str(us.agent_id) == obj['id']]
                return_data.append(obj)

            page = self.paginate_queryset(return_data)
            if page is not None:
                return self.get_paginated_response(return_data)
            return Response(return_data)

        else:
            
            user_projects = user.projects.all()
            qs = self.filter_queryset(
                self.get_queryset().filter(projects__in=user_projects).distinct()
            )
            serialized_data = self.get_serializer(qs, many=True).data
            return_data = []
            for obj in serialized_data:
                obj['chat_sessions'] = [{
                    "id": str(us.id),
                    "session_key": str(us.session_key),
                    "agent_id": str(us.agent_id),
                    "user_id": str(us.user_id),
                    "data": us.data,
                    "created_at": us.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f%z")
                } for us in user_sessions if str(us.agent_id) == obj['id']]
                return_data.append(obj)

            page = self.paginate_queryset(return_data)
            if page is not None:
                return self.get_paginated_response(return_data)
            
            return Response(return_data)

    @swagger_auto_schema(
        operation_summary="Get bot by ID",
        operation_description="Returns the data of a specific bot by its ID.",
        responses={
            200: openapi.Response("Bot found", BotN8nSerializer),
            400: openapi.Response("Invalid ID"),
            404: openapi.Response("Bot not found"),
        },
        tags=["Agents"],
    )
    def retrieve(self, request, *args, **kwargs):
        bot = self.get_object()
        return Response(self.get_serializer(bot).data)

    @swagger_auto_schema(
        operation_summary="Create new bot",
        operation_description="Creates a new bot. The field `url_n8n` is required.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "name": openapi.Schema(type=openapi.TYPE_STRING),
                "description": openapi.Schema(type=openapi.TYPE_STRING),
                "url_n8n": openapi.Schema(type=openapi.TYPE_STRING, format="url"),
            },
            required=["url_n8n"],
        ),
        responses={201: openapi.Response("Bot created successfully", BotN8nSerializer)},
        tags=["Agents"],
    )
    def create(self, request, *args, **kwargs):
        if not is_admin_by_role(request.user):
            return Response(
                {"detail": "Only administrators can perform this action."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if Agents.objects.filter(name__iexact=serializer.validated_data["name"]).exists():
            return Response(
                {"detail": "A bot with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bot = Agents.objects.create(
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
            url_n8n=serializer.validated_data["url_n8n"],
        )
        return Response(BotN8nSerializer(bot).data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Partially update a bot",
        operation_description="Updates only provided fields (name, description, url_n8n, active, expertise_area).",
        request_body=BotPartialUpdateSerializer,
        responses={
            200: openapi.Response("Bot updated successfully", BotN8nSerializer),
            400: openapi.Response("Invalid ID or invalid data"),
            404: openapi.Response("Bot not found"),
        },
        tags=["Agents"],
    )
    def partial_update(self, request, *args, **kwargs):
        bot = self.get_object()
        serializer = self.get_serializer(bot, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(BotN8nSerializer(updated).data)

    @swagger_auto_schema(
        operation_summary="Delete bot",
        responses={
            204: openapi.Response("Bot deleted successfully"),
            400: openapi.Response("Invalid ID"),
            404: openapi.Response("Bot not found"),
        },
        tags=["Agents"],
    )
    def destroy(self, request, *args, **kwargs):
        bot = self.get_object()
        bot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @swagger_auto_schema(
        method="post",
        operation_summary="Set/Clear bot expertise area",
        operation_description=(
            "Associates an expertise area to the bot. "
            "Send {'expertise_area': '<uuid>'} to set, or {'expertise_area': null} to clear."
        ),
        request_body=BotExpertiseOnlySerializer,
        responses={200: openapi.Response("OK", BotN8nSerializer)},
        tags=["Agents"],
    )
    @action(detail=True, methods=["post"], url_path="expertise")
    def expertise(self, request, *args, **kwargs):
        bot = self.get_object()
        s = self.get_serializer(instance=bot, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(BotN8nSerializer(bot).data, status=status.HTTP_200_OK)
