from src.domain.models.memo import Memo
from src.infrastructure.database.models.memo_orm import MemoOrm


def to_domain(orm: MemoOrm) -> Memo:
    return Memo(
        id=orm.id or 0,
        title=orm.title,
        body=orm.body,
        user_id=orm.user_id,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


def to_orm(domain: Memo) -> MemoOrm:
    return MemoOrm(
        id=None if domain.id == 0 else domain.id,
        title=domain.title,
        body=domain.body,
        user_id=domain.user_id,
        created_at=domain.created_at,
        updated_at=domain.updated_at,
    )
