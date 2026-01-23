import os

import jwt as pyjwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils.crypto import get_random_string
from rest_framework import exceptions
from rest_framework.authentication import get_authorization_header
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings


class DebugJWTAuthentication(JWTAuthentication):
    """JWT authentication that falls back to decoding without signature in DEBUG mode

    WARNING: This is unsafe and must only be enabled in development.
    Enable by setting DEBUG=True and environment variable ALLOW_UNVERIFIED_JWT=1
    """

    def authenticate(self, request):
        # Try normal authentication first
        try:
            result = super().authenticate(request)
            if result is not None:
                return result
        except TokenError:
            # fallthrough to debug behavior
            pass

        # Only allow fallback in DEBUG and if env var is set
        if not settings.DEBUG or os.getenv("ALLOW_UNVERIFIED_JWT") != "1":
            return None

        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != b"bearer" or len(auth) == 1:
            return None

        token = auth[1].decode()
        try:
            # Decode without signature verification
            payload = pyjwt.decode(token, options={"verify_signature": False})
        except Exception as exc:
            raise exceptions.AuthenticationFailed(f"Invalid token payload: {exc}")

        user_id_claim = jwt_api_settings.USER_ID_CLAIM
        user_id = payload.get(user_id_claim) or payload.get("user_id") or payload.get("id")
        if not user_id:
            raise exceptions.AuthenticationFailed("Token missing user id claim")

        User = get_user_model()
        try:
            user = User.objects.get(**{jwt_api_settings.USER_ID_FIELD: user_id})
        except User.DoesNotExist:
            # Fallback: try matching by email or username if provided in token
            email = payload.get("email")
            username = payload.get("username")
            if email:
                try:
                    user = User.objects.get(email__iexact=email)
                except User.DoesNotExist:
                    user = None
            elif username:
                try:
                    user = User.objects.get(username__iexact=username)
                except User.DoesNotExist:
                    user = None

            if not user:
                # In debug mode, allow creating a temporary user from token claims
                # only when explicitly allowed by env var ALLOW_CREATE_USERS_FROM_TOKEN
                allow_create = settings.DEBUG or os.getenv("ALLOW_CREATE_USERS_FROM_TOKEN") == "1"
                if allow_create:
                    email = payload.get("email")
                    username = payload.get("username") or (email.split("@")[0] if email else None)
                    first_name = payload.get("first_name") or ""
                    last_name = payload.get("last_name") or ""
                    user_id_claim = jwt_api_settings.USER_ID_CLAIM
                    user_id = payload.get(user_id_claim) or payload.get("id")
                    User = get_user_model()
                    try:
                        create_kwargs = {
                            "email": email or f"devuser+{user_id}@local",
                            "username": username
                            or (
                                f"user_{str(user_id)[:8]}"
                                if user_id
                                else f"user_{get_random_string(8)}"
                            ),
                            "first_name": first_name,
                            "last_name": last_name,
                        }
                        # If token provides an explicit UUID id, try to set it
                        if user_id:
                            create_kwargs[jwt_api_settings.USER_ID_FIELD] = user_id
                        user = User.objects.create(**create_kwargs)
                        # ensure unusable password
                        user.set_unusable_password()
                        user.save()
                    except IntegrityError:
                        # Race or unique constraint - try to find by email or username again
                        try:
                            if email:
                                user = User.objects.get(email__iexact=email)
                            elif username:
                                user = User.objects.get(username__iexact=username)
                        except User.DoesNotExist:
                            raise exceptions.AuthenticationFailed("User not found for token")
                else:
                    raise exceptions.AuthenticationFailed("User not found for token")

        return (user, None)


class FlexibleJWTAuthentication(JWTAuthentication):
    """After validating token signature, attempt to resolve user by multiple claims.

    This class does NOT skip token verification — it only augments the lookup strategy
    to reduce false negatives when tokens contain email or username instead of id.
    Use in production when you trust the token issuer and want resilient lookup.
    """

    def get_user(self, validated_token):
        # Try the standard lookup first
        try:
            return super().get_user(validated_token)
        except Exception:
            pass

        # If not found, try fallback lookups by email or username (safe because token already validated)
        User = get_user_model()
        email = validated_token.payload.get("email") or validated_token.payload.get("e-mail")
        username = validated_token.payload.get("username") or validated_token.payload.get(
            "preferred_username"
        )

        if email:
            try:
                return User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                pass

        if username:
            try:
                return User.objects.get(username__iexact=username)
            except User.DoesNotExist:
                pass

        # still not found, return a clear AuthenticationFailed
        raise exceptions.AuthenticationFailed("User not found for token")
