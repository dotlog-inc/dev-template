from src.domain.exceptions import NotFoundError
from src.domain.repositories.memo_repository import MemoRepository


class DeleteMemoUseCase:
    def __init__(self, memo_repo: MemoRepository) -> None:
        self._memo_repo = memo_repo

    def execute(self, user_id: str, memo_id: int) -> None:
        memo = self._memo_repo.get(memo_id)
        if memo is None or memo.user_id != user_id:
            raise NotFoundError(f"Memo {memo_id} not found")
        self._memo_repo.delete(memo)
