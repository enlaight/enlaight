import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.models.chat_sessions import ChatSession
from authentication.models.agents import Agents
from authentication.serializers.search_serializer import SearchSerializer

import json

class SearchView(viewsets.ModelViewSet):
    serializer_class = SearchSerializer
    queryset = ChatSession.objects.all()
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    http_method_names = ["post"]

    target_path = "/webhook/get-message/"

    def _build_headers(self):
        return {
            "key": settings.N8N_KB_KEY,
            "Content-Type": "application/json",
        }

    @swagger_auto_schema(
        operation_summary="Pesquisa chat history por query",
        operation_description="Pesquisa no chat por query. Requer autenticação JWT.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["query"],
            properties={
                "query": openapi.Schema(type=openapi.TYPE_STRING, description="Search Term"),
            },
        ),
        responses={
            201: openapi.Response("Respostas com sucesso sucesso", SearchSerializer),
            400: openapi.Response("Cliente já existe"),
            401: openapi.Response("Não autenticado"),
        },
        security=[{"Bearer": []}],
        tags=["Search"],
    )
    def create(self, request, *args, **kwargs):
        user = request.user
        user_query = request.data.get("query")

		# Get all user sessions
        # and list them in sql query friendly format
        qs = self.get_queryset()
        qs_filtered = qs.filter(user=user)
        sessions_qs = ChatSession.objects.filter(user=user)

        user_sessions = qs_filtered if len(qs_filtered) > 0 else sessions_qs
        sessions_ids = [str(obj.session_key) for obj in user_sessions]
        session_agent_dict = {us.session_key: str(us.agent_id) for us in user_sessions}

        search_query = ['%', user_query.replace(',', ' '), '%']

        payload_n8n = {
            "session_ids": sessions_ids,
            "search_query": search_query,
        }

        if not settings.N8N_BASE_URL or not self._build_headers().get("key"):
            return Response(
                {"detail": "Configuração do N8N ausente (N8N_BASE_URL/N8N_KB_KEY)."}, status=500
            )

        url = f"{settings.N8N_BASE_URL}{self.target_path}"

        try:
            upstream = requests.post(
                url, headers=self._build_headers(), json=payload_n8n, timeout=10
            )
            data = upstream.json()
        except requests.Timeout:
            return Response({"detail": "Timeout ao chamar serviço externo."}, status=504)
        
        except (requests.RequestException, ValueError) as e:
            return Response({"detail": f"Erro ao chamar serviço externo: {e}"}, status=502)
        
        results = [{
            "session_id": res['session_id'],
            "message": res['message'].get("content", ""),
            "author": res['message'].get("type", "human"),
            "agent_id": str(session_agent_dict.get(res['session_id']))
        } for res in data['data']]

        return Response({ "status": "success", "results": results }, status=status.HTTP_201_CREATED)
