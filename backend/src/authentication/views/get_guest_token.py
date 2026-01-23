import datetime

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


class GetGuestTokenView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    http_method_names = ["post"]

    @swagger_auto_schema(
        operation_summary="Obter Guest Token",
        operation_description="Gera um guest token para acesso embedado ao Superset.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=[],
            properties={
                "dashId": openapi.Schema(
                    type=openapi.TYPE_STRING, description="UUID da Dashboard do Superset"
                ),
            },
        ),
        responses={
            200: openapi.Response(
                "Guest token JWT",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={"token": openapi.Schema(type=openapi.TYPE_STRING)},
                ),
            ),
            400: "Bad Request",
            500: "Internal Server Error",
        },
        tags=["Superset"],
    )
    def create(self, request, *args, **kwargs):
        info = []
        try:
            dashboard_id = request.data.get("dashId")
            info.append(f"dashboard_id: {dashboard_id}")
            if not dashboard_id:
                return Response(
                    {
                        "error": "Failed to authenticate with Superset",
                        "details": login_response.text,
                    },
                    status=login_response.status_code,
                )

            # We need to create a session to keep track of cookies
            session = requests.Session()
            info.append(f"session: {session}")

            SUPERSET_BASE_URL = "https://superset.enlaight.ai"
            info.append(f"base_url: {SUPERSET_BASE_URL}")

            # Get Access Token
            login_response = session.post(
                f"{SUPERSET_BASE_URL}/api/v1/security/login",
                json={
                    "username": "admin",
                    "password": "admin",
                    "provider": "db",
                    "refresh": True,
                },
            )
            info.append(f"login_response: {login_response.json()}")

            login_data = login_response.json()
            access_token = login_data["access_token"]

            # Logins through form, getting the CSRF token, as the API throws an error
            form_login = session.post(
                f"{SUPERSET_BASE_URL}/login/",
                data={"username": "admin", "password": "admin"},
                allow_redirects=True,
            )
            soup = BeautifulSoup(form_login.text, "html.parser")
            csrf_token = soup.find("input", {"id": "csrf_token"})["value"]
            info.append(f"csrf_token: {csrf_token}")
            payload = {
                "user": {"username": "Guest_User", "first_name": "Guest", "last_name": "User"},
                "resources": [{"type": "dashboard", "id": dashboard_id}],
                "rls": [],
                "aud": "superset",
                "type": "guest",
            }
            info.append(f"payload: {payload}")

            guest_response = session.post(
                f"{SUPERSET_BASE_URL}/api/v1/security/guest_token/",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-CSRFToken": f"{csrf_token}",
                },
            )
            info.append(f"guest_response: {guest_response}")

            if guest_response.status_code == 200:
                return Response(guest_response.json(), status=200)
            else:
                return Response(
                    {"error": "Failed to get guest token", "details": guest_response.text},
                    status=guest_response.status_code,
                )
        except Exception as e:
            return Response({"error": "Server error", "details": f"{e}", "info": info}, status=500)
