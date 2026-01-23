from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from authentication.models.kb import KBLink
from authentication.models.projects import Projects

ADMIN_VALUES = {"ADMIN", "ADMINISTRATOR"}


def is_admin_by_role(user) -> bool:
    return bool(
        user and user.is_authenticated and str(getattr(user, "role", "")).upper() in ADMIN_VALUES
    )


class IsAdminByRole(BasePermission):
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return is_admin_by_role(getattr(request, "user", None))


class IsAdminOrRelatedToBot(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if is_admin_by_role(user):
            return True
        return obj.projects.filter(users__id=user.id).exists()


def assert_user_project_access(user, project: Projects) -> None:
    """Ensures the authenticated user can access the given project.

    Admins/superusers bypass. Non-admins must be explicitly related to the project.
    Raises PermissionDenied otherwise.
    """
    if not user or not getattr(user, "is_authenticated", False):
        raise PermissionDenied("Autenticação obrigatória.")

    if getattr(user, "is_superuser", False) or is_admin_by_role(user):
        return

    # Non-admins: must belong to the project
    if not project.users.filter(id=user.id).exists():
        raise PermissionDenied("Você não tem acesso a este projeto.")


def assert_user_kb_access(user, hash_id: str) -> None:
    """Ensures the user can access the KB identified by hash_id via KBLink.
    Knowledge Base link.
    Admins/superusers bypass. For others, the KB must be linked to a project the user belongs to.
    Raises PermissionDenied if access is not allowed or link is unknown.
    """
    if not user or not getattr(user, "is_authenticated", False):
        raise PermissionDenied("Autenticação obrigatória.")

    if getattr(user, "is_superuser", False) or is_admin_by_role(user):
        return

    # Find any project that links to this KB and is associated to the user
    if not KBLink.objects.filter(external_id=hash_id, project__users__id=user.id).exists():
        # Return generic denial to avoid leaking existence information across tenants
        raise PermissionDenied("Você não tem acesso a este KB.")
