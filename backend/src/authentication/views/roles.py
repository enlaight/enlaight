from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models.roles import UserRole


class RolesListView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_summary="List available user roles",
        responses={200: openapi.Response(description="List of roles")},
        tags=["Auth"],
        security=[],
    )
    def get(self, request):
        roles = [{"value": role.value, "label": role.value} for role in UserRole]
        return Response({"roles": roles})
