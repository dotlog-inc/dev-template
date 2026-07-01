from datetime import UTC, datetime

from src.application.dto.memo import CreateMemoDTO
from src.domain.models.memo import Memo
from src.domain.repositories.memo_repository import MemoRepository


class CreateMemoUseCase:
    def __init__(self, memo_repo: MemoRepository) -> None:
        self._memo_repo = memo_repo

    def execute(self, dto: CreateMemoDTO) -> Memo:
        now = datetime.now(UTC)
        memo = Memo(
            id=0,
            title=dto.title,
            body=dto.body,
            user_id=dto.user_id,
            created_at=now,
            updated_at=now,
        )
        return self._memo_repo.add(memo)
