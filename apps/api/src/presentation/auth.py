from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.domain.exceptions import UnauthorizedError
from src.domain.models.user import User
from src.domain.ports.auth_service import AuthIdentity
from src.presentation.di.auth import AuthServiceDep
from src.presentation.di.usecase import GetUserUseCaseDep

_bearer = HTTPBearer(auto_error=False)
_BearerCreds = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def _require_credentials(credentials: HTTPAuthorizationCredentials | None) -> HTTPAuthorizationCredentials:
    if credentials is None:
        raise UnauthorizedError("認証トークンがありません")
    return credentials


def get_auth_identity(
    credentials: _BearerCreds,
    auth_service: AuthServiceDep,
) -> AuthIdentity:
    creds = _require_credentials(credentials)
    return auth_service.verify_token(creds.credentials)


def get_current_user(
    credentials: _BearerCreds,
    auth_service: AuthServiceDep,
    usecase: GetUserUseCaseDep,
) -> User:
    creds = _require_credentials(credentials)
    identity = auth_service.verify_token(creds.credentials)
    return usecase.execute(identity.uid)


CurrentIdentity = Annotated[AuthIdentity, Depends(get_auth_identity)]
CurrentUser = Annotated[User, Depends(get_current_user)]
