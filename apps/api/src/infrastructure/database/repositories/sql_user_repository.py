from sqlmodel import Session, select

from src.domain.models.user import User
from src.infrastructure.database.mappers import user_mapper
from src.infrastructure.database.models.user_orm import UserOrm


class SqlUserRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, user_id: str) -> User | None:
        orm = self._session.get(UserOrm, user_id)
        return user_mapper.to_domain(orm) if orm else None

    def get_by_email(self, email: str) -> User | None:
        orm = self._session.exec(select(UserOrm).where(UserOrm.email == email)).first()
        return user_mapper.to_domain(orm) if orm else None

    def add(self, user: User) -> User:
        orm = user_mapper.to_orm(user)
        self._session.add(orm)
        self._session.flush()
        self._session.refresh(orm)
        return user_mapper.to_domain(orm)
