from fastapi import APIRouter, status

from src.application.dto.user import RegisterUserDTO
from src.domain.models.user import User
from src.presentation.auth import CurrentIdentity, CurrentUser
from src.presentation.di.usecase import GetUserUseCaseDep, RegisterUserUseCaseDep
from src.presentation.schema.user import UserCreateRequest, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserCreateRequest,
    identity: CurrentIdentity,
    usecase: RegisterUserUseCaseDep,
) -> UserResponse:
    user = usecase.execute(
        RegisterUserDTO(uid=identity.uid, email=identity.email, name=payload.name)
    )
    return _to_response(user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser, usecase: GetUserUseCaseDep) -> UserResponse:  # noqa: ARG001
    return _to_response(current_user)
