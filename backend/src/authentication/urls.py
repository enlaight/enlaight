from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenVerifyView

from authentication.views.authentication import (
    AddUserRoleView,
    CustomTokenBlacklistView,
    CustomTokenRefreshView,
    ForgotPasswordView,
    LoginView,
    MeView,
    RemoveUserRoleView,
    ResetPasswordView,
    UserCreateView,
    UserProfileUpdateView,
    UserRolesView,
)
from authentication.views.board import BoardViewSet
from authentication.views.bot import BotViewSet
from authentication.views.chat_favorites import ChatFavoriteViewSet
from authentication.views.chat_session import ChatSessionView
from authentication.views.client import ClientViewSet
from authentication.views.debug_check_token import debug_check_token
from authentication.views.debug_token import debug_token
from authentication.views.expertise_area import ExpertiseAreaViewSet
from authentication.views.get_guest_token import GetGuestTokenView
from authentication.views.google_auth import GoogleAuthView
from authentication.views.health_db import db_health
from authentication.views.invite import ConfirmInviteView, InviteUserView
from authentication.views.kb import KBGetProxyView
from authentication.views.kb_create import KBCreateProxyView
from authentication.views.kb_delete import KBDeleteProxyView
from authentication.views.kb_edit import KBEditProxyView
from authentication.views.kb_file_add import KBFileAddProxyView
from authentication.views.kb_file_delete import KBFileDeleteProxyView
from authentication.views.kb_link import KBLinkAttachView
from authentication.views.kb_list import KBFileListProxyView
from authentication.views.kb_list_all import KBListAllProxyView
from authentication.views.kb_update import KBFileUpdateProxyView
from authentication.views.login_as import LoginAsView
from authentication.views.project import ProjectViewSet
from authentication.views.roles import RolesListView
from authentication.views.translation import TranslateBatchView, TranslateLookupView
from authentication.views.user import UserViewSet
from authentication.views.search import SearchView

client_router = DefaultRouter()
client_router.register(r"", ClientViewSet, basename="client")

project_router = DefaultRouter()
project_router.register(r"", ProjectViewSet, basename="project")

board_router = DefaultRouter()
board_router.register(r"", BoardViewSet, basename="board")

bot_router = DefaultRouter()
bot_router.register(r"bots", BotViewSet, basename="bot")

chat_session_router = DefaultRouter()
chat_session_router.register(r"", ChatSessionView, basename="chat_session")

search_router = DefaultRouter()
search_router.register(r"", SearchView, basename="search")

expertise_router = DefaultRouter()
expertise_router.register(r"expertise-areas", ExpertiseAreaViewSet, basename="expertise-area")

chat_favorites_router = DefaultRouter()
chat_favorites_router.register(r"chat-favorites", ChatFavoriteViewSet, basename="chat-favorites")


urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("create/", UserCreateView.as_view(), name="user_create"),
    # path("auth/google/", GoogleAuthView.as_view(), name="google-auth"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("users/", UserViewSet.as_view(), name="users"),
    path("logout/", CustomTokenBlacklistView.as_view(), name="token_blacklist"),
    path("invite/", InviteUserView.as_view(), name="invite_user"),
    path("invite/confirm/", ConfirmInviteView.as_view(), name="confirm_user"),
    path("me/", MeView.as_view(), name="me"),
    path("me/update/", UserProfileUpdateView.as_view(), name="user_profile_update"),
    path("roles/", RolesListView.as_view(), name="roles_list"),
    path("password/forgot/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("password/reset/", ResetPasswordView.as_view(), name="reset_password"),
    path("users/<uuid:user_id>/roles/", UserRolesView.as_view()),
    path("users/<uuid:user_id>/roles/add/", AddUserRoleView.as_view()),
    path("users/<uuid:user_id>/roles/remove/", RemoveUserRoleView.as_view()),
    path("clients/", include(client_router.urls)),
    path("projects/", include(project_router.urls)),
    path("boards/", include(board_router.urls)),
    path("chat-session/", include(chat_session_router.urls)),
    path("search/", include(search_router.urls)),
    path("", include(bot_router.urls)),
    path("", include(expertise_router.urls)),
    path("", include(chat_favorites_router.urls)),
    path("login-as/<uuid:user_id>/", LoginAsView.as_view(), name="login_as"),
    path("kb/get/", KBGetProxyView.as_view(), name="kb_get"),
    path("kb/files/list/", KBFileListProxyView.as_view(), name="kb_file_list"),
    path("kb/create/", KBCreateProxyView.as_view(), name="kb_create"),
    path("kb/file/add/", KBFileAddProxyView.as_view(), name="kb_file_add"),
    path("kb/edit/", KBEditProxyView.as_view(), name="kb_edit"),
    path("kb/delete/", KBDeleteProxyView.as_view(), name="kb_delete"),
    path("kb/file/delete/", KBFileDeleteProxyView.as_view(), name="kb_file_delete"),
    path("kb/list-all/", KBListAllProxyView.as_view(), name="kb_list_all"),
    path("kb/file/update/", KBFileUpdateProxyView.as_view(), name="kb_file_update"),
    path("kb/attach/", KBLinkAttachView.as_view(), name="kb_attach"),
    path("i18n/translate/", TranslateLookupView.as_view(), name="i18n_translate"),
    path("i18n/translate/batch/", TranslateBatchView.as_view(), name="i18n_translate_batch"),
    path(
        "superset/guest-token/",
        GetGuestTokenView.as_view({"post": "create"}),
        name="get-guest-token",
    ),
    path("health/db/", db_health, name="health_db"),
    # Development-only debug endpoints
    path("debug/token/", debug_token, name="debug_token"),
    path("debug/check-token/", debug_check_token, name="debug_check_token"),
    path("verify-token/", TokenVerifyView.as_view(), name="token_verify"),
]
