from typing import Any, cast

import firebase_admin.auth as fb_auth
from firebase_admin import exceptions as fb_exceptions  # type: ignore[import-untyped]

from src.domain.exceptions import UnauthorizedError
from src.domain.ports.auth_service import AuthIdentity


class FirebaseAuthService:
    def verify_token(self, token: str) -> AuthIdentity:
        try:
            decoded = cast(
                dict[str, Any],
                fb_auth.verify_id_token(token),  # type: ignore[reportUnknownMemberType]
            )
            uid = str(decoded["uid"])
            email = str(decoded.get("email", ""))
            return AuthIdentity(uid=uid, email=email)
        except (
            fb_auth.InvalidIdTokenError,
            fb_auth.ExpiredIdTokenError,
            fb_auth.RevokedIdTokenError,
            fb_auth.CertificateFetchError,
            fb_exceptions.FirebaseError,
        ) as e:
            raise UnauthorizedError("Invalid or expired token") from e
