from typing import Annotated

from fastapi import Depends

from src.domain.ports.auth_service import AuthService
from src.infrastructure.auth.firebase_auth_service import FirebaseAuthService


def get_auth_service() -> AuthService:
    return FirebaseAuthService()


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
