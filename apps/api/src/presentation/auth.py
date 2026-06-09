from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.application.usecase.get_user import GetUserUseCase
from src.domain.exceptions import UnauthorizedError
from src.domain.models.user import User
from src.domain.ports.auth_service import AuthIdentity
from src.infrastructure.database.repositories.sql_user_repository import SqlUserRepository
from src.presentation.di.auth import AuthServiceDep
from src.presentation.di.database import SessionDep

_bearer = HTTPBearer(auto_error=False)
_BearerCreds = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def get_auth_identity(
    credentials: _BearerCreds,
    auth_service: AuthServiceDep,
) -> AuthIdentity:
    if credentials is None:
        raise UnauthorizedError("認証トークンがありません")
    return auth_service.verify_token(credentials.credentials)


def get_current_user(
    credentials: _BearerCreds,
    session: SessionDep,
    auth_service: AuthServiceDep,
) -> User:
    if credentials is None:
        raise UnauthorizedError("認証トークンがありません")
    identity = auth_service.verify_token(credentials.credentials)
    usecase = GetUserUseCase(SqlUserRepository(session))
    return usecase.execute(identity.uid)


CurrentIdentity = Annotated[AuthIdentity, Depends(get_auth_identity)]
CurrentUser = Annotated[User, Depends(get_current_user)]
