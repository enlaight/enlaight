from urllib.parse import quote_plus
from uuid import UUID, uuid4

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models.clients import Clients
from authentication.models.invite import Invite
from authentication.models.projects import Projects
from authentication.models.roles import UserRole
from authentication.views.authentication import enviar_email_convite

User = get_user_model()
import logging

logger = logging.getLogger(__name__)


class InviteUserView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="invite_user",
        operation_summary="Invite a user",
        operation_description=(
            "Sends an invitation for the user to register.\n\n"
            "Who can use it:\n"
            "- ADMINISTRATOR and MANAGER.\n\n"
            "Rules by profile:\n"
            "- ADMINISTRATOR: can invite to any project. Can send `client_id`; if omitted, the client is inferred from `project_id`.\n"
            "When sending `client_id`, the project must belong to that client.\n"
            "- MANAGER: can only invite to projects to which they belong and cannot invite `ADMINISTRATOR`.\n"
            "For MANAGER, `client_id` is ignored (it is always inferred from `project_id`).\n\n"
            "Required fields: `email`, `project_id`.\n"
            "The guest's `role` field is optional (default: USER)."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "email": openapi.Schema(
                    type=openapi.TYPE_STRING, description="Email do usuário a ser convidado"
                ),
                "role": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description=(
                        "Role of invited user (ADMINISTRATOR, MANAGER ou USER).\n"
                        "Managers cannot invite ADMINISTRATOR."
                    ),
                    enum=[role.value for role in UserRole],
                    default=UserRole.USER.value,
                ),
                "client_id": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description=(
                        "ID of cliente. Optional for ADMINISTRATOR (if omitted, it is inferred from `project_id`).\n"
                        "Ignored for MANAGER (always inferred from `project_id`)."
                    ),
                ),
                "project_id": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="ID of project (required)",
                ),
            },
            required=["email", "project_id"],
        ),
        responses={
            200: openapi.Response("Invitation sent successfully"),
            400: openapi.Response("Validation or business error"),
            403: openapi.Response("No permission or MANAGER rules violated"),
            404: openapi.Response("Client or Project not found"),
        },
        tags=["Invites"],
        security=[{"Bearer": []}],
    )
    def post(self, request):
        inviter_role = getattr(request.user, "role", None)
        if inviter_role not in (UserRole.ADMINISTRATOR.value, UserRole.MANAGER.value):
            return Response({"error": "User does not have permission to invite"}, status=403)

        email = request.data.get("email")
        project_id = request.data.get("project_id")
        invited_role = request.data.get("role", UserRole.USER.value)

        if not email or not project_id:
            return Response({"error": "Missing required fields: email, project_id"}, status=400)

        if invited_role not in UserRole._value2member_map_:
            return Response({"error": "Invalid invited role"}, status=400)

        with transaction.atomic():
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                if getattr(existing_user, "is_active", False):
                    return Response(
                        {"error": "User with this email already exists."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                base_email = email + '+EXPIRED'
                new_email = base_email
                counter = 1
                while User.objects.filter(email=new_email).exists():
                    new_email = f"{base_email}{counter}"
                    counter += 1

                existing_user.email = new_email
                existing_user.save()

                # Now check if any users at all exist for this email, if none, we create to have an user for invite view
                user_for_invite = User.objects.filter(email=email).first()
                if not user_for_invite:
                    base_username = email.split("@")[0]
                    username = base_username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1
                    User.objects.create_user(
                        username=username,
                        email=email,
                        password=None,
                        is_active=False,
                    )

            else:
                base_username = email.split("@")[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                User.objects.create_user(
                    username=username,
                    email=email,
                    password=None,
                    is_active=False,
                )

            pending_invites = Invite.objects.filter(email=email, expires_at__gte=timezone.now()).exists()
            if pending_invites:
                return Response(
                    {"detail": "Already exists a pending invite for this user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Invites can't have repeated emails, so we add a marker for the expired ones
            expired_invites = Invite.objects.filter(email=email, expires_at__lte=timezone.now())
            for expired_inv in expired_invites:
                
                base_email = email + '+EXPIRED'
                new_email = base_email
                counter = 1
                while Invite.objects.filter(email=new_email).exists():
                    new_email = f"{base_email}{counter}"
                    counter += 1

                expired_inv.email = new_email
                expired_inv.save()

            # Validate project exists first
            try:
                project = Projects.objects.get(id=project_id)
            except Projects.DoesNotExist:
                return Response({"error": "Project não encontrado"}, status=404)

            # Resolve client_id conforme a role do convidante
            client_id_from_req = request.data.get("client_id")
            if inviter_role == UserRole.ADMINISTRATOR.value:
                # Admin: usa client_id se fornecido; se não, infere do projeto
                resolved_client_id = client_id_from_req or getattr(project, "client_id", None)
            else:
                # Manager: sempre infere do projeto
                resolved_client_id = getattr(project, "client_id", None)

            if not resolved_client_id:
                return Response({"error": "Cannot determine client"}, status=400)

            # Busca client e valida relação com o projeto
            try:
                client = Clients.objects.get(id=resolved_client_id)
            except Clients.DoesNotExist:
                return Response({"error": "Client not found"}, status=404)

            if project.client_id != client.id:
                return Response(
                    {"error": "Project does not belong to the informed client"}, status=400
                )

            # Regras específicas para MANAGER
            if inviter_role == UserRole.MANAGER.value:
                # manager pode convidar apenas para projetos onde participa e não pode convidar ADMINISTRATOR
                if not request.user.projects.filter(id=project.id).exists():
                    return Response({"error": "Manager não associado ao projeto"}, status=403)
                if invited_role == UserRole.ADMINISTRATOR.value:
                    return Response(
                        {"error": "Manager cannot invite an ADMINISTRATOR"}, status=403
                    )

            token = uuid4()

            invite_kwargs = {
                "sender": request.user,
                "email": email,
                "token": token,
                "role": invited_role,
                "client": client,
                "project": project,
            }
            Invite.objects.create(**invite_kwargs)

        # Build link that points to the frontend confirmation route.
        # Use token first and email second (email URL-encoded).
        frontend_base = "https://platform-v2.enlaight.ai"
        link = (
            f"{frontend_base.rstrip('/')}/confirm-invite?"
            f"token={token}&email={quote_plus(email)}"
        )
        contexto_email = {
            "link": link,
            "nm_pessoa": email.split("@")[0],
        }
        try:
            enviar_email_convite(email, contexto_email)
        except Exception:
            # Fallback para comportamento anterior caso a geração/ envio via MJML falhe
            send_mail(
                subject="Invitation to Enlaight Platform",
                message=f"Use this link to confirm your registration: {link}",
                from_email=None,
                recipient_list=[email],
            )

        return Response({"detail": "Convite enviado com sucesso."}, status=status.HTTP_200_OK)


class ConfirmInviteView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        qs = request.META.get("QUERY_STRING", "")
        url = (
            f"https://platform-v2.enlaight.ai/confirm-invite?{qs}"
            if qs
            else "https://platform-v2.enlaight.ai/confirm-invite"
        )
        return redirect(url)

    def post(self, request):
        email = request.query_params.get("email")
        token = request.query_params.get("token")
        new_password = request.data.get("password")

        if not all([email, token, new_password]):
            return Response({"error": "Campos obrigatórios: email, token, password"}, status=400)

        try:
            token_uuid = UUID(token)
        except ValueError:
            return Response({"error": "Token malformado"}, status=400)

        # Try to locate invite by email+token. Prefer matching project if provided.
        project_q = request.query_params.get("project_id")
        try:
            if project_q:
                invite = Invite.objects.get(email=email, token=token_uuid, project_id=project_q)
            else:
                invite = Invite.objects.get(email=email, token=token_uuid)
        except Invite.DoesNotExist:
            return Response({"error": "Convite não encontrado"}, status=400)

        if invite.expires_at < timezone.now():
            return Response({"error": "Convite expirado"}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Usuário não encontrado"}, status=404)

        user.set_password(new_password)
        user.is_active = True
        if hasattr(user, "active"):
            user.active = True
        user.role = invite.role
        user.client_id = invite.client_id
        user.save()

        # Associate user with the invited project if present
        try:
            if invite.project_id:
                user.projects.add(invite.project)
        except Exception:
            # non-fatal: log but continue
            logger.exception(
                "Erro ao associar usuário ao projeto do convite: %s", invite.project_id
            )

        if invite.role == UserRole.ADMINISTRATOR.value:
            user.is_staff = True
            user.is_superuser = True

        user.save()
        invite.delete()

        return Response({"detail": "Conta ativada e senha definida com sucesso."}, status=200)
