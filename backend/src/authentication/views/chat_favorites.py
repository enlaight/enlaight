from django.shortcuts import get_object_or_404
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.models.agents import Agents
from authentication.models.chat_favorites import ChatFavorite
from authentication.models.chat_sessions import ChatSession
from authentication.serializers.chat_favorites_serializer import ChatFavoriteSerializer


class ChatFavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = ChatFavoriteSerializer
    queryset = ChatFavorite.objects.all()
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        user = self.request.user
        qs = ChatFavorite.objects.filter(user=user)

        agent_id = self.request.query_params.get("agent_id")
        session_key = self.request.query_params.get("session_key")

        if agent_id:
            qs = qs.filter(agent_id=agent_id)
        if session_key:
            qs = qs.filter(session__session_key=session_key)

        return qs

    @swagger_auto_schema(
        operation_summary="Listar favoritos",
        operation_description="Lista mensagens favoritas do usuário, filtrando por agent_id e/ou session_key.",
        tags=["Chat_Favorites"],
    )
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        chat_sessions = ChatSession.objects.filter(user=request.user)
        chat_sessions_dict = {cs.id: str(cs.session_key) for cs in chat_sessions}

        return_data = [{
            "agent": fav.agent_id,
            "session": chat_sessions_dict.get(fav.session_id, ""),
            "text": fav.text,
            "message_id": fav.message_id,
            "agent_name": ""
        } for fav in qs]

        return Response(return_data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_summary="Criar favorito",
        operation_description="Marca uma mensagem como favorita.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["session_key", "agent_id", "message_id", "text"],
            properties={
                "session_key": openapi.Schema(type=openapi.TYPE_STRING),
                "agent_id": openapi.Schema(type=openapi.TYPE_INTEGER),
                "message_id": openapi.Schema(type=openapi.TYPE_STRING),
                "text": openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        tags=["Chat_Favorites"],
        responses={201: ChatFavoriteSerializer},
    )
    def create(self, request, *args, **kwargs):
        user = request.user
        session_key = request.data.get("session_key")
        agent_id = request.data.get("agent_id")
        message_id = request.data.get("message_id")
        text = request.data.get("text", "")

        if not (session_key and agent_id and message_id):
            return Response(
                {"detail": "session_key, agent_id e message_id são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agent = get_object_or_404(Agents, id=agent_id)
        session = get_object_or_404(
            ChatSession,
            session_key=session_key,
            agent=agent,
            user=user,
        )

        favorite, created = ChatFavorite.objects.get_or_create(
            user=user,
            agent=agent,
            session=session,
            message_id=message_id,
            defaults={"text": text},
        )

        return_data = {
            "session": session_key,
            "agent": agent_id,
            "message_id": message_id,
            "text": text,
            "agent_name": agent.name
        }
        return Response(
            return_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @swagger_auto_schema(
        operation_summary="Remover favorito",
        operation_description="Remove um favorito pelo ID.",
        tags=["Chat_Favorites"],
    )
    def destroy(self, request, *args, **kwargs):
        try:
            user = request.user
            message_id = kwargs.get("pk")

            if not (message_id):
                return Response(
                    {"detail": "message_id é obrigatórios."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            favorite_objects = ChatFavorite.objects.filter(
                message_id=message_id, user=user
            )
            if favorite_objects.count() > 0:
                favorite_object = favorite_objects[0]
                favorite_object.delete()

            return Response(
                {"status": "success", "details": "Favorite deleted!"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            print(e)
            return Response({"status": "error"})