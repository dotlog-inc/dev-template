from src.domain.models.user import User
from src.infrastructure.database.models.user_orm import UserOrm


def to_domain(orm: UserOrm) -> User:
    return User(
        id=orm.id,
        name=orm.name,
        email=orm.email,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


def to_orm(domain: User) -> UserOrm:
    return UserOrm(
        id=domain.id,
        name=domain.name,
        email=domain.email,
        created_at=domain.created_at,
        updated_at=domain.updated_at,
    )
