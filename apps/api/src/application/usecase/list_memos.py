from src.domain.models.memo import Memo
from src.domain.repositories.memo_repository import MemoRepository


class ListMemosUseCase:
    def __init__(self, memo_repo: MemoRepository) -> None:
        self._memo_repo = memo_repo

    def execute(self, user_id: str) -> list[Memo]:
        return self._memo_repo.list_by_user(user_id)
