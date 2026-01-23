from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from authentication.models.expertise_area import ExpertiseArea
from authentication.serializers.default_pagination import DefaultPagination
from authentication.serializers.expertise_area_create_serializer import (
    ExpertiseAreaCreateSerializer,
)
from authentication.serializers.expertise_area_partial_update_serializer import (
    ExpertiseAreaPartialUpdateSerializer,
)
from authentication.serializers.expertise_area_serializer import ExpertiseAreaSerializer


class ExpertiseAreaViewSet(viewsets.ModelViewSet):
    queryset = ExpertiseArea.objects.all().order_by("name")
    serializer_class = ExpertiseAreaSerializer

    permission_classes = []
    authentication_classes = []
    http_method_names = ["get", "post", "patch", "delete"]

    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ["name", "description"]
    pagination_class = DefaultPagination

    def get_serializer_class(self):
        if self.action == "create":
            return ExpertiseAreaCreateSerializer
        if self.action in {"partial_update", "update"}:
            return ExpertiseAreaPartialUpdateSerializer
        return ExpertiseAreaSerializer

    @swagger_auto_schema(
        operation_summary="List expertise areas",
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
                description="Search across name/description",
            ),
        ],
        responses={
            200: openapi.Response("List of expertise areas", ExpertiseAreaSerializer(many=True))
        },
        tags=["Expertise Areas"],
    )
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)

    @swagger_auto_schema(
        operation_summary="Get expertise area by ID",
        responses={200: openapi.Response("Found", ExpertiseAreaSerializer), 404: "Not found"},
        tags=["Expertise Areas"],
    )
    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        return Response(ExpertiseAreaSerializer(obj).data)

    @swagger_auto_schema(
        operation_summary="Create new expertise area",
        operation_description="Creates an expertise area. `name` is required and unique (case-insensitive).",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "name": openapi.Schema(
                    type=openapi.TYPE_STRING, description="e.g., Legal Assistant, Medical Support"
                ),
                "description": openapi.Schema(
                    type=openapi.TYPE_STRING, description="Optional brief description"
                ),
            },
            required=["name"],
        ),
        responses={201: openapi.Response("Created", ExpertiseAreaSerializer)},
        tags=["Expertise Areas"],
    )
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ExpertiseArea.objects.create(**ser.validated_data)
        return Response(ExpertiseAreaSerializer(obj).data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_summary="Partially update an expertise area",
        request_body=ExpertiseAreaPartialUpdateSerializer,
        responses={200: openapi.Response("Updated", ExpertiseAreaSerializer), 404: "Not found"},
        tags=["Expertise Areas"],
    )
    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = self.get_serializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ExpertiseAreaSerializer(obj).data)

    @swagger_auto_schema(
        operation_summary="Delete an expertise area",
        responses={204: "Deleted", 404: "Not found"},
        tags=["Expertise Areas"],
    )
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
