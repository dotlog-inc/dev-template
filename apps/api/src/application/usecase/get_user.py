from src.domain.exceptions import NotFoundError
from src.domain.models.user import User
from src.domain.repositories.user_repository import UserRepository


class GetUserUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    def execute(self, uid: str) -> User:
        user = self._user_repo.get(uid)
        if user is None:
            raise NotFoundError(f"User {uid} not found")
        return user
