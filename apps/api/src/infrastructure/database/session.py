from collections.abc import Generator

from sqlmodel import Session, create_engine

from src.utils.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
