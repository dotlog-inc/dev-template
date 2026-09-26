from collections.abc import Generator

from sqlmodel import Session, create_engine

from src.config import settings
from src.db_guard import ensure_connectable

# **エンジンを作る前に検査する**（#30）。`create_engine` は接続を張らないので、ここで止めないと
# 「起動は成功し、最初のクエリで初めて本番へ繋がる」になる
ensure_connectable(database_url=settings.database_url, allowed_hosts=settings.db_allowed_hosts)

engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_session() -> Generator[Session]:
    with Session(engine) as session:
        yield session
