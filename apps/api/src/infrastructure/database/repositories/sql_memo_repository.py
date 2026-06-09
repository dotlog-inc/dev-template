from sqlmodel import Session, col, select

from src.domain.models.memo import Memo
from src.infrastructure.database.mappers import memo_mapper
from src.infrastructure.database.models.memo_orm import MemoOrm


class SqlMemoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_by_user(self, user_id: str) -> list[Memo]:
        orms = self._session.exec(
            select(MemoOrm).where(MemoOrm.user_id == user_id).order_by(col(MemoOrm.updated_at).desc())
        ).all()
        return [memo_mapper.to_domain(o) for o in orms]

    def get(self, memo_id: int) -> Memo | None:
        orm = self._session.get(MemoOrm, memo_id)
        return memo_mapper.to_domain(orm) if orm else None

    def add(self, memo: Memo) -> Memo:
        orm = memo_mapper.to_orm(memo)
        self._session.add(orm)
        self._session.flush()
        self._session.refresh(orm)
        return memo_mapper.to_domain(orm)

    def update(self, memo: Memo) -> Memo:
        orm = self._session.get(MemoOrm, memo.id)
        if orm is None:
            msg = f"Memo {memo.id} not found"
            raise ValueError(msg)
        orm.title = memo.title
        orm.body = memo.body
        orm.updated_at = memo.updated_at
        self._session.add(orm)
        self._session.flush()
        self._session.refresh(orm)
        return memo_mapper.to_domain(orm)

    def delete(self, memo: Memo) -> None:
        orm = self._session.get(MemoOrm, memo.id)
        if orm is not None:
            self._session.delete(orm)
            self._session.flush()
