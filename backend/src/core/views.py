from django.http import JsonResponse
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@swagger_auto_schema(
    method="get",
    operation_summary="Health check",
    operation_description="Simple health/ping endpoint.",
    responses={200: openapi.Response(description="OK")},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    """Simple health/ping endpoint."""
    return JsonResponse({"status": "ok"}, status=200)
