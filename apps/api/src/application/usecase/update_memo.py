from datetime import UTC, datetime

from src.application.dto.memo import UNSET, UpdateMemoDTO
from src.domain.exceptions import NotFoundError
from src.domain.models.memo import Memo
from src.domain.repositories.memo_repository import MemoRepository


class UpdateMemoUseCase:
    def __init__(self, memo_repo: MemoRepository) -> None:
        self._memo_repo = memo_repo

    def execute(self, dto: UpdateMemoDTO) -> Memo:
        memo = self._memo_repo.get(dto.memo_id)
        if memo is None or memo.user_id != dto.user_id:
            raise NotFoundError(f"Memo {dto.memo_id} not found")
        memo.title = dto.title if dto.title is not None else memo.title
        if dto.body is not UNSET:
            memo.body = dto.body
        memo.updated_at = datetime.now(UTC)
        return self._memo_repo.update(memo)
