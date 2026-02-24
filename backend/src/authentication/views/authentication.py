import logging
import os
import subprocess
from datetime import date, datetime
from uuid import UUID

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, models
from django.db.models.fields.files import FieldFile
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.timezone import localtime
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from authentication.debug_auth import DebugJWTAuthentication, FlexibleJWTAuthentication
from authentication.models import UserProfile
from authentication.serializers.login_serializer import LoginSerializer
from authentication.serializers.user_profile import UserProfileSerializer
from authentication.serializers.user_profile_create_serializer import UserProfileCreateSerializer
from authentication.serializers.user_profile_update_serializer import UserProfileUpdateSerializer
from core import settings

logger = logging.getLogger(__name__)
User = get_user_model()

CUSTOM_CLAIMS = (
    "id",
    "full_name",
    "email",
    "username",
    "job_title",
    "department",
    "first_name",
    "role",
    "is_active",
    "avatar",
    "status",
    "joined_at",
    "is_superuser",
    "is_staff",
)


def _to_claim(value):
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if hasattr(value, "value"):
        return value.value
    if isinstance(value, FieldFile):
        if getattr(value, "name", None):
            try:
                return value.url
            except Exception:
                return value.name
        return None
    return str(value)


def enrich_refresh_claims(refresh: RefreshToken, user) -> RefreshToken:
    for field in CUSTOM_CLAIMS:
        if field == "id":
            val = str(getattr(user, "id", None))
        elif field == "avatar":
            f = getattr(user, "avatar", None)
            val = _to_claim(f)
        else:
            val = _to_claim(getattr(user, field, None))
        refresh[field] = val
    return refresh


def make_refresh_for_user(user) -> RefreshToken:
    refresh = RefreshToken.for_user(user)
    user_id_claim = jwt_api_settings.USER_ID_CLAIM
    user_id_field = jwt_api_settings.USER_ID_FIELD
    refresh[user_id_claim] = str(getattr(user, user_id_field))
    return enrich_refresh_claims(refresh, user)


def make_stateless_refresh_for_user(user) -> RefreshToken:
    """Create a RefreshToken instance without invoking any DB-backed OutstandingToken creation.

    This builds a refresh token manually, sets jti/iat/exp and populates custom claims.
    Use this only as a fallback when the usual RefreshToken.for_user(user) raises DB errors.
    """
    refresh = RefreshToken()
    user_id_claim = jwt_api_settings.USER_ID_CLAIM
    user_id_field = jwt_api_settings.USER_ID_FIELD
    # set essential claims
    try:
        refresh[user_id_claim] = str(getattr(user, user_id_field))
    except Exception:
        # best-effort: skip if user field not present
        pass

    # set timing and unique id
    refresh.set_iat()
    refresh.set_exp()
    refresh.set_jti()

    # add custom claims
    for field in CUSTOM_CLAIMS:
        if field == "id":
            val = str(getattr(user, "id", None))
        elif field == "avatar":
            f = getattr(user, "avatar", None)
            val = _to_claim(f)
        else:
            val = _to_claim(getattr(user, field, None))
        if val is not None:
            try:
                refresh[field] = val
            except Exception:
                # ignore claims that cannot be set
                pass

    return refresh


def make_stateless_refresh_for_user(user) -> RefreshToken:
    """Create a RefreshToken instance without invoking any DB-backed OutstandingToken creation.

    This builds a refresh token manually, sets jti/iat/exp and populates custom claims.
    Use this only as a fallback when the usual RefreshToken.for_user(user) raises DB errors.
    """
    refresh = RefreshToken()
    user_id_claim = jwt_api_settings.USER_ID_CLAIM
    user_id_field = jwt_api_settings.USER_ID_FIELD
    # set essential claims
    try:
        refresh[user_id_claim] = str(getattr(user, user_id_field))
    except Exception:
        # best-effort: skip if user field not present
        pass

    # set timing and unique id
    refresh.set_iat()
    refresh.set_exp()
    refresh.set_jti()

    # add custom claims
    for field in CUSTOM_CLAIMS:
        if field == "id":
            val = str(getattr(user, "id", None))
        elif field == "avatar":
            f = getattr(user, "avatar", None)
            val = _to_claim(f)
        else:
            val = _to_claim(getattr(user, field, None))
        if val is not None:
            try:
                refresh[field] = val
            except Exception:
                # ignore claims that cannot be set
                pass

    return refresh


def make_refresh_from_payload(old_refresh: RefreshToken) -> RefreshToken:
    user_id_claim = jwt_api_settings.USER_ID_CLAIM

    new_refresh = RefreshToken()
    new_refresh[user_id_claim] = old_refresh[user_id_claim]

    new_refresh.set_iat()
    new_refresh.set_exp()
    new_refresh.set_jti()

    for field in CUSTOM_CLAIMS:
        if field in old_refresh.payload:
            new_refresh[field] = old_refresh.payload[field]

    return new_refresh


def compile_mjml(mjml_path, html_output_path):
    try:
        subprocess.run(["mjml", mjml_path, "-o", html_output_path], check=True)
    except subprocess.CalledProcessError as e:
        print("Erro ao compilar MJML:", e)


def enviar_email_recuperacao(destinatario, contexto):
    mjml_path = "authentication/templates/email/recuperacao_senha.mjml"
    html_output_path = "authentication/templates/email/recuperacao_senha_compilado.html"

    if not os.path.exists(html_output_path) or os.path.getmtime(mjml_path) > os.path.getmtime(
        html_output_path
    ):
        compile_mjml(mjml_path, html_output_path)

    with open(html_output_path, "r", encoding="utf-8") as f:
        html_corpo = f.read()

    for key, value in contexto.items():
        html_corpo = html_corpo.replace(f"${key}", str(value))

    email = EmailMultiAlternatives(
        subject="Reset Password",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destinatario],
    )
    email.attach_alternative(html_corpo, "text/html")
    email.send()


def enviar_email_convite(destinatario, contexto):
    mjml_path = "authentication/templates/email/invite_convite.mjml"
    html_output_path = "authentication/templates/email/invite_convite_compilado.html"

    # Forçar recompilação em deploys (opcional: remover o arquivo compilado)
    if os.environ.get("FORCE_MJML_COMPILE") == "1" and os.path.exists(html_output_path):
        os.remove(html_output_path)
    try:
        with open(mjml_path, "r", encoding="utf-8") as f:
            mjml_src = f.read()

        for key, value in contexto.items():
            mjml_src = mjml_src.replace(f"${key}", str(value))

        tmp_mjml = mjml_path + ".tmp"
        with open(tmp_mjml, "w", encoding="utf-8") as f:
            f.write(mjml_src)

        compile_mjml(tmp_mjml, html_output_path)

        try:
            os.remove(tmp_mjml)
        except Exception:
            pass

        with open(html_output_path, "r", encoding="utf-8") as f:
            html_corpo = f.read()

    except Exception:
        html_corpo = ""
        if os.path.exists(html_output_path):
            with open(html_output_path, "r", encoding="utf-8") as f:
                html_corpo = f.read()
            for key, value in contexto.items():
                html_corpo = html_corpo.replace(f"${key}", str(value))

    if not html_corpo:
        html_corpo = f"<p>Use este link para confirmar seu cadastro: <a href=\"{contexto.get('link')}\">{contexto.get('link')}</a></p>"

    # Defensive check: if compiled HTML still contains template markers
    # like Jinja/Django style {{ ... }}, abort so the caller can fall back
    # to a safe plain-text email. This surfaces template processing bugs
    # instead of silently sending malformed emails.
    if ("{{" in html_corpo) or ("}}" in html_corpo) or ("{%" in html_corpo):
        logger.error(
            "Unprocessed template variables found in invite email body for %s. Aborting HTML send.",
            destinatario,
        )
        raise RuntimeError("Unprocessed template variables in compiled email body")

    email = EmailMultiAlternatives(
        subject="You're invited to join Enlaight",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destinatario],
    )
    email.attach_alternative(html_corpo, "text/html")
    email.send()


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @swagger_auto_schema(
        operation_id="login_user",
        operation_summary="Login de usuário",
        operation_description="Realiza o login de um usuário com email ou username e senha, retornando tokens de acesso e refresh.",
        request_body=LoginSerializer,
        responses={
            200: openapi.Response("Tokens gerados com sucesso"),
            401: openapi.Response("Credenciais inválidas"),
        },
        tags=["Auth"],
        security=[],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data.get("email")
        username = serializer.validated_data.get("username")
        password = serializer.validated_data.get("password")

        user = None
        try:
            if email:
                user = User.objects.get(email__iexact=email)
            elif username:
                user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            user = None

        if user is None:
            return Response(
                {"detail": "Credenciais inválidas"}, status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            ok = user.check_password(password or "")
        except Exception as e:
            return Response(
                {"detail": "Erro interno ao validar credenciais"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        if not ok:
            return Response(
                {"detail": "Credenciais inválidas"}, status=status.HTTP_401_UNAUTHORIZED
            )
        # generate tokens; wrap in try/except to avoid unhandled 500s in prod
        try:
            refresh = make_refresh_for_user(user)
            access = refresh.access_token
            for k in CUSTOM_CLAIMS:
                access[k] = refresh.get(k)

            return Response(
                {"access": str(access), "refresh": str(refresh)}, status=status.HTTP_200_OK
            )
        except IntegrityError as ie:
            # This likely comes from an issue creating OutstandingToken (FK to user missing).
            # Fall back to returning an access token only so login succeeds.
            logger.exception(
                "IntegrityError while generating refresh token for user %s - falling back to access-only: %s",
                getattr(user, "id", None),
                ie,
            )
            try:
                # First try to return a stateless refresh + access to preserve client behaviour
                try:
                    stateless_refresh = make_stateless_refresh_for_user(user)
                    stateless_access = stateless_refresh.access_token
                    # ensure access has same custom claims
                    for k in CUSTOM_CLAIMS:
                        if k in stateless_refresh.payload:
                            stateless_access[k] = stateless_refresh.payload.get(k)

                    return Response(
                        {"access": str(stateless_access), "refresh": str(stateless_refresh)},
                        status=status.HTTP_200_OK,
                    )
                except Exception:
                    # if anything fails, fall back to access-only token
                    access = AccessToken.for_user(user)
                    # add custom claims to access for compatibility
                    for k in CUSTOM_CLAIMS:
                        try:
                            access[k] = _to_claim(getattr(user, k, None))
                        except Exception:
                            # ignore claim enrichment errors
                            pass
                    return Response({"access": str(access)}, status=status.HTTP_200_OK)
            except Exception:
                logger.exception(
                    "Failed to generate fallback access token for user %s",
                    getattr(user, "id", None),
                )
                return Response(
                    {"detail": "Internal server error while generating tokens"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            # log full traceback for debugging in production logs, but return safe JSON
            logger.exception("Error generating JWT tokens for user %s", getattr(user, "id", None))
            return Response(
                {"detail": "Internal server error while generating tokens"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UserCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # signup público
    serializer_class = UserProfileCreateSerializer
    queryset = UserProfile.objects.all()

    @swagger_auto_schema(
        operation_id="create_account",
        operation_summary="Criação de conta",
        operation_description="Cria uma conta (UserProfile) com email, username, nome, sobrenome e senha.",
        request_body=UserProfileCreateSerializer,
        responses={
            201: openapi.Response(
                description="Conta criada com sucesso",
                schema=UserProfileCreateSerializer,
            ),
            400: openapi.Response(
                description="Erro de validação, dados inválidos",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "detail": openapi.Schema(
                            type=openapi.TYPE_STRING, description="Mensagem de erro detalhada"
                        ),
                        "errors": openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="Dicionário de erros de validação",
                            additional_properties=openapi.Schema(
                                type=openapi.TYPE_STRING,
                                description="Mensagem de erro para cada campo",
                            ),
                        ),
                    },
                ),
            ),
        },
        security=[],
        tags=["Auth"],
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = make_refresh_for_user(user)
        access = refresh.access_token
        for k in CUSTOM_CLAIMS:
            access[k] = refresh.get(k)

        return Response(
            {
                "user": serializer.data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class CustomTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @swagger_auto_schema(
        operation_summary="Renova o token de acesso usando o refresh token",
        tags=["Auth"],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={"refresh": openapi.Schema(type=openapi.TYPE_STRING)},
            required=["refresh"],
        ),
        responses={
            200: openapi.Response(
                description="Tokens renovados com sucesso",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "access": openapi.Schema(type=openapi.TYPE_STRING),
                        "refresh": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            )
        },
        security=[],
    )
    def post(self, request, *args, **kwargs):
        refresh_str = (request.data or {}).get("refresh")
        if not refresh_str:
            return Response(
                {"detail": "Field 'refresh' is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            old_refresh = RefreshToken(refresh_str)
        except TokenError as e:
            return Response(
                {"detail": "Invalid refresh token.", "error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        access = old_refresh.access_token

        for field in CUSTOM_CLAIMS:
            if field in old_refresh.payload:
                access[field] = old_refresh.payload[field]

        payload = {"access": str(access)}

        if jwt_api_settings.ROTATE_REFRESH_TOKENS:
            if jwt_api_settings.BLACKLIST_AFTER_ROTATION:
                # Defensive: ensure the refresh token contains the configured user id claim
                user_id_claim = jwt_api_settings.USER_ID_CLAIM
                has_user_claim = user_id_claim in getattr(old_refresh, "payload", {})

                if not has_user_claim:
                    logger.warning(
                        "Old refresh token missing '%s' claim; skipping blacklist to avoid DB IntegrityError.",
                        user_id_claim,
                    )
                else:
                    try:
                        old_refresh.blacklist()
                    except AttributeError:
                        logger.warning(
                            "Token blacklist not enabled; could not blacklist the refresh token."
                        )
                    except TokenError:
                        # propagate TokenError (invalid token) as before
                        raise
                    except IntegrityError as e:
                        # Specific DB integrity error observed in production (user_id NULL)
                        logger.exception("IntegrityError while blacklisting refresh token: %s", e)
                    except Exception:
                        # Log unexpected errors but do not fail the refresh operation
                        logger.exception(
                            "Unexpected error while blacklisting refresh token; continuing."
                        )

        new_refresh = make_refresh_from_payload(old_refresh)
        payload["refresh"] = str(new_refresh)

        return Response(payload, status=status.HTTP_200_OK)


class CustomTokenBlacklistView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @swagger_auto_schema(
        operation_summary="Logout - invalida o refresh token",
        tags=["Auth"],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={"refresh": openapi.Schema(type=openapi.TYPE_STRING)},
        ),
        responses={
            200: openapi.Response(description="Logout realizado (token na blacklist)"),
            400: openapi.Response(description="Token inválido, ausente ou já invalidado"),
        },
        security=[],
    )
    def post(self, request, *args, **kwargs):
        refresh_str = request.data.get("refresh") or request.COOKIES.get("refresh")
        if not refresh_str:
            return Response(
                {"error": "Campo 'refresh' obrigatório ou cookie ausente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_str)
            token.blacklist()
        except TokenError:
            return Response(
                {"error": "Token inválido ou já invalidado."}, status=status.HTTP_400_BAD_REQUEST
            )

        resp = Response({"detail": "Logout realizado."}, status=status.HTTP_200_OK)
        resp.delete_cookie("access", samesite="Lax")
        resp.delete_cookie("refresh", samesite="Lax")
        return resp


class MeView(APIView):
    authentication_classes = [FlexibleJWTAuthentication, JWTAuthentication, DebugJWTAuthentication]
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="get_me",
        operation_summary="Get current user profile",
        operation_description="Returns the profile of the currently authenticated user.",
        responses={
            200: openapi.Response("Current user profile", UserProfileSerializer),
            401: openapi.Response("Not authenticated"),
        },
        security=[{"Bearer": []}],
        tags=["Auth"],
    )
    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={"request": request})
        return Response(serializer.data)


class UserProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    @swagger_auto_schema(
        operation_summary="Atualizar perfil do usuário",
        tags=["Auth"],
        request_body=UserProfileUpdateSerializer,
        consumes=["multipart/form-data"],
        responses={
            200: openapi.Response(
                description="Perfil atualizado com sucesso",
                schema=UserProfileUpdateSerializer,
            ),
            400: openapi.Response(
                description="Erro de validação, dados inválidos",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "detail": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            description="Erro de validação, dados inválidos",
                        ),
                        "errors": openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="Dicionário de erros de validação",
                            additional_properties=openapi.Schema(
                                type=openapi.TYPE_STRING,
                                description="Mensagem de erro para cada campo",
                            ),
                        ),
                    },
                ),
            ),
        },
        security=[{"Bearer": []}],
    )
    def patch(self, request):
        user = request.user
        serializer = UserProfileUpdateSerializer(
            user, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    @swagger_auto_schema(
        operation_summary="Solicitar recuperação de senha",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "email": openapi.Schema(type=openapi.TYPE_STRING, description="Email cadastrado"),
            },
            required=["email"],
        ),
        responses={200: "Email enviado com sucesso", 404: "Usuário não encontrado"},
        tags=["Password"],
    )
    def post(self, request):
        email = request.data.get("email")
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Usuário não encontrado"}, status=404)

        token = get_random_string(length=64)
        user.password_reset_token = token
        user.password_reset_token_expires_at = timezone.now() + timezone.timedelta(hours=1)
        user.save()

        frontend_base = "https://platform-v2.enlaight.ai"
        reset_link = (
            f"{frontend_base.rstrip('/')}/reset-password/?email={email}&token={token}"
        )
        expiration_time = localtime(user.password_reset_token_expires_at).strftime(
            "%H:%M:%S de %d/%m/%Y"
        )

        contexto_email = {
            "nm_pessoa": user.first_name if user.first_name else email.split("@")[0],
            "link_botao": reset_link,
            "expiracao": expiration_time,
        }

        enviar_email_recuperacao(
            destinatario=email,
            contexto=contexto_email,
        )

        return Response({"detail": "Email enviado com sucesso"}, status=200)


class ResetPasswordView(APIView):
    @swagger_auto_schema(
        operation_summary="Redefinir senha",
        manual_parameters=[
            openapi.Parameter("email", openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("token", openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "new_password": openapi.Schema(type=openapi.TYPE_STRING),
            },
            required=["new_password"],
        ),
        responses={
            200: "Senha redefinida",
            400: "Token inválido ou expirado",
            404: "Usuário não encontrado",
        },
        tags=["Password"],
    )
    def post(self, request):
        email = request.query_params.get("email")
        token = request.query_params.get("token")
        new_password = request.data.get("new_password")

        if not all([email, token, new_password]):
            return Response(
                {"error": "Campos obrigatórios: email, token, new_password"}, status=400
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Usuário não encontrado"}, status=404)

        if (
            not user.password_reset_token
            or user.password_reset_token != token
            or not user.password_reset_token_expires_at
            or user.password_reset_token_expires_at < timezone.now()
        ):
            return Response({"error": "Token inválido ou expirado"}, status=400)

        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_token_expires_at = None
        user.save()

        return Response({"detail": "Senha redefinida com sucesso"}, status=200)


class UserRolesView(APIView):
    @swagger_auto_schema(
        operation_summary="Obter papéis do usuário",
        manual_parameters=[
            openapi.Parameter(
                "user_id",
                openapi.IN_PATH,
                type=openapi.TYPE_STRING,
                format="uuid",
                required=True,
                description="UUID do usuário",
            )
        ],
        responses={
            200: openapi.Response(
                description="Lista de papéis do usuário",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "roles": openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(type=openapi.TYPE_STRING),
                        )
                    },
                    required=["roles"],
                ),
            ),
            404: "Usuário não encontrado",
        },
        tags=["User-Roles"],
        security=[],
    )
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            roles = user.groups.values_list("name", flat=True)
            return Response({"roles": list(roles)}, status=200)
        except User.DoesNotExist:
            return Response({"error": "Usuário não encontrado"}, status=404)


class AddUserRoleView(APIView):
    @swagger_auto_schema(
        operation_summary="Adicionar papel ao usuário",
        manual_parameters=[
            openapi.Parameter(
                "user_id",
                openapi.IN_PATH,
                type=openapi.TYPE_STRING,
                format="uuid",
                required=True,
                description="UUID do usuário",
            )
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "role": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Nome do papel a ser adicionado",
                )
            },
            required=["role"],
        ),
        responses={
            200: "Papel adicionado com sucesso",
            400: "Campo 'role' obrigatório",
            404: "Usuário não encontrado",
        },
        tags=["User-Roles"],
        security=[],
    )
    def post(self, request, user_id):
        role = request.data.get("role")
        if not role:
            return Response({"error": "Campo 'role' obrigatório."}, status=400)

        try:
            user = User.objects.get(id=user_id)
            group, _ = Group.objects.get_or_create(name=role)
            user.groups.add(group)
            return Response({"detail": f"Role '{role}' adicionada ao usuário."}, status=200)
        except User.DoesNotExist:
            return Response({"error": "Usuário não encontrado"}, status=404)


class RemoveUserRoleView(APIView):
    @swagger_auto_schema(
        operation_summary="Remover papel do usuário",
        manual_parameters=[
            openapi.Parameter(
                "user_id",
                openapi.IN_PATH,
                type=openapi.TYPE_STRING,
                format="uuid",
                required=True,
                description="UUID do usuário",
            )
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "role": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Nome do papel a ser removido",
                )
            },
            required=["role"],
        ),
        responses={
            200: "Papel removido com sucesso",
            400: "Campo 'role' obrigatório",
            404: "Usuário ou role não encontrada",
        },
        tags=["User-Roles"],
        security=[],
    )
    def delete(self, request, user_id):
        role = request.data.get("role")
        if not role:
            return Response({"error": "Campo 'role' obrigatório."}, status=400)

        try:
            user = User.objects.get(id=user_id)
            try:
                group = Group.objects.get(name=role)
                user.groups.remove(group)
                return Response({"detail": f"Role '{role}' removida do usuário."}, status=200)
            except Group.DoesNotExist:
                return Response({"error": "Role não encontrada."}, status=404)
        except User.DoesNotExist:
            return Response({"error": "Usuário não encontrado"}, status=404)
