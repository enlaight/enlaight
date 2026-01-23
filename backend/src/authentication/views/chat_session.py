from django.contrib.auth import get_user_model
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.models.agents import Agents
from authentication.models.chat_sessions import ChatSession
from authentication.serializers.chat_sessions_serializer import ChatSessionSerializer


class ChatSessionView(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    queryset = ChatSession.objects.all()
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    http_method_names = ["get", "post", "delete"]

    @swagger_auto_schema(
        operation_summary="Listar as sessions recentes do usuário",
        operation_description="Lista as sessions recentes do usuário. Requer autenticação JWT.",
        responses={
            200: openapi.Response("Chat Sessions recentes", ChatSessionSerializer(many=True)),
            400: openapi.Response("Erro"),
        },
        security=[{"Bearer": []}],
        tags=["Chat_Sessions"],
    )
    def list(self, request, *args, **kwargs):
        user = request.user
        # Get last 6 sessions of the user, newest first
        qs = ChatSession.objects.filter(user=user).order_by("-created_at")[:6]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Criar nova session",
        operation_description="Cria uma nova session no sistema. Requer autenticação JWT.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["session_key", "agent_id"],
            properties={
                "session_key": openapi.Schema(
                    type=openapi.TYPE_STRING, description="Unique session key"
                ),
                "agent_id": openapi.Schema(
                    type=openapi.TYPE_STRING, description="ID of the agent"
                ),
            },
        ),
        responses={
            201: openapi.Response("Session criado com sucesso", ChatSessionSerializer),
            400: openapi.Response("Session já existe"),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Chat_Sessions"],
    )
    def create(self, request, *args, **kwargs):
        user = request.user
        session_key = request.data.get("session_key")
        agent_id = request.data.get("agent_id")
        first_message = request.data.get("first_message")

        if not session_key or not agent_id:
            return Response(
                {"detail": "session_key and agent_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            agent = Agents.objects.get(id=agent_id)
        except Agents.DoesNotExist:
            return Response({"detail": "Agent not found."}, status=status.HTTP_400_BAD_REQUEST)

        existing_session = ChatSession.objects.filter(
            session_key=session_key, agent=agent, user=user
        )

        if existing_session.count() > 0:
            return Response(
                {"status": "error", "details": "Session already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chat_session = ChatSession.objects.create(
            session_key=session_key, agent=agent, user=user, data=first_message
        )
        serializer = self.get_serializer(chat_session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        method="delete",
        operation_summary="Delete a chat session",
        operation_description="Deletes a chat session by session_key and agent_id. Requires authentication.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["session_key", "agent_id"],
            properties={
                "session_key": openapi.Schema(
                    type=openapi.TYPE_STRING, description="Unique session key"
                ),
                "agent_id": openapi.Schema(
                    type=openapi.TYPE_INTEGER, description="ID of the agent"
                ),
            },
        ),
        responses={
            200: "Chat session deleted successfully",
            400: "Invalid data",
            404: "Chat session not found",
        },
        security=[{"Bearer": []}],
        tags=["Chat_Sessions"],
    )
    @action(detail=False, methods=["delete"])
    def delete(self, request, *args, **kwargs):
        session_key = request.data.get("session_key")
        agent_id = request.data.get("agent_id")

        if not session_key or not agent_id:
            return Response(
                {"detail": "session_key and agent_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            chat_session = ChatSession.objects.get(
                session_key=session_key, agent_id=agent_id, user=request.user
            )
        except ChatSession.DoesNotExist:
            return Response(
                {"detail": "Chat session not found."}, status=status.HTTP_404_NOT_FOUND
            )

        chat_session.delete()
        return Response(
            {"detail": "Chat session deleted successfully."}, status=status.HTTP_200_OK
        )
