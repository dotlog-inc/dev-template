from datetime import UTC, datetime

from src.application.dto.user import RegisterUserDTO
from src.domain.exceptions import ConflictError
from src.domain.models.user import User
from src.domain.repositories.user_repository import UserRepository


class RegisterUserUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    def execute(self, dto: RegisterUserDTO) -> User:
        if self._user_repo.get(dto.uid) is not None:
            raise ConflictError(f"User {dto.uid} already exists")
        if self._user_repo.get_by_email(dto.email) is not None:
            raise ConflictError(f"Email {dto.email} already registered")
        now = datetime.now(UTC)
        user = User(
            id=dto.uid,
            name=dto.name,
            email=dto.email,
            created_at=now,
            updated_at=now,
        )
        return self._user_repo.add(user)
