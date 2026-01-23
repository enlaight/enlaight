import time

from django.db import DatabaseError, connections
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@swagger_auto_schema(
    method="get",
    operation_summary="Database health check",
    operation_description="Verify database connection (SELECT 1).",
    responses={
        200: openapi.Response(description="Database reachable"),
        503: openapi.Response(description="Database unreachable"),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def db_health(_request):
    start = time.time()
    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        latency_ms = int((time.time() - start) * 1000)
        return Response({"status": "ok", "db": "ok", "latency_ms": latency_ms}, status=200)
    except DatabaseError as exc:
        return Response({"status": "error", "db": "down", "detail": str(exc)}, status=503)
