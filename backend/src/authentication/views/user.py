from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import ListAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from authentication.debug_auth import FlexibleJWTAuthentication
from authentication.models.projects import Projects
from authentication.models.roles import UserRole
from authentication.models.user_profile import UserProfile
from authentication.permissions import is_admin_by_role
from authentication.serializers.create_serializer import UserCreateSerializer
from authentication.serializers.default_pagination import DefaultPagination
from authentication.serializers.user_detail_serializer import UserDetailSerializer
from authentication.utils import _split_name


class UserViewSet(ListAPIView):
    authentication_classes = [FlexibleJWTAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    serializer_class = UserDetailSerializer

    def get_serializer_class(self):
        if getattr(self, "request", None) and self.request.method == "POST":
            return UserCreateSerializer
        return UserDetailSerializer

    pagination_class = DefaultPagination
    queryset = UserProfile.objects.all().order_by("-joined_at")

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["department"]
    search_fields = ["full_name", "email", "department"]

    ordering_fields = ["joined_at", "full_name"]
    ordering = ["-joined_at"]

    # ---- GET (list) ----
    def _serialize_user(self, u: UserProfile) -> dict:
        first, last = _split_name(u.full_name or "")
        username = getattr(u, "username", None) or (u.email.split("@")[0] if u.email else None)
        projects_qs = Projects.objects.filter(users__id=u.id)
        projects = [{"id": str(p.id), "name": p.name} for p in projects_qs]
        client_id = getattr(u, "client_id", None)

        return {
            "id": str(u.id),
            "first_name": first,
            "last_name": last,
            "email": u.email,
            "username": username,
            "avatar": (
                u.avatar.url if getattr(u, "avatar", None) and hasattr(u.avatar, "url") else None
            ),
            "role": u.role,
            "date_joined": u.joined_at,
            "job_title": u.job_title,
            "department": u.department,
            "is_active": u.is_active,
            "active": u.active,
            "is_staff": u.is_staff,
            "projects": projects,
            "client_id": client_id,
        }

    @swagger_auto_schema(
        operation_summary="Listar usuários",
        tags=["Users"],
        responses={200: UserDetailSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        user_data = UserDetailSerializer(request.user).data
        is_admin = user_data.get("role", "").upper() in {"ADMINISTRATOR"}
        if not is_admin:
            return Response([])
        qs = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(qs)
        if page is not None:
            data = [self._serialize_user(u) for u in page]
            return self.get_paginated_response(data)

        data = [self._serialize_user(u) for u in qs]
        return Response(data)

    @swagger_auto_schema(
        operation_summary="Criar usuário",
        tags=["Users"],
        consumes=["multipart/form-data"],
        request_body=None,
        manual_parameters=[
            openapi.Parameter(
                "full_name", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True
            ),
            openapi.Parameter("email", openapi.IN_FORM, type=openapi.TYPE_STRING, required=True),
            openapi.Parameter(
                "role",
                openapi.IN_FORM,
                type=openapi.TYPE_STRING,
                required=False,
                enum=[r.value for r in UserRole],
            ),
            openapi.Parameter(
                "job_title", openapi.IN_FORM, type=openapi.TYPE_STRING, required=False
            ),
            openapi.Parameter(
                "department", openapi.IN_FORM, type=openapi.TYPE_STRING, required=False
            ),
            openapi.Parameter(
                "joined_at",
                openapi.IN_FORM,
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATE,
                required=False,
                description="YYYY-MM-DD",
            ),
            openapi.Parameter("avatar", openapi.IN_FORM, type=openapi.TYPE_FILE, required=False),
        ],
        responses={201: UserDetailSerializer},
    )
    def post(self, request, *args, **kwargs):
        ct = (request.content_type or "").lower()
        if not (
            ct.startswith("multipart/form-data")
            or ct.startswith("application/x-www-form-urlencoded")
        ):
            return Response(
                {"detail": "Unsupported Media Type. Use multipart/form-data."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        print(f"user={user}, type={type(user)}, role={getattr(user, 'role', None)}")
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)
