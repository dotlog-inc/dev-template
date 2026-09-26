"""
ロールの分離が効いていること（#29）。

**規約ではなく機械で確かめる。** アプリ用ロールが DDL を打てる状態は、テストもアプリも
緑のまま通り過ぎる。気づくのは、そのロールの資格情報が漏れたときか、RLS を入れて
所有者経由で回避されたときになる。

`db` マーカーを付けているので既定の `pytest` からは外れる（`pyproject.toml` の addopts）。
実行には PostgreSQL が要る: `docker compose up -d db && mise run //apps/api:test:db`
"""

from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import ProgrammingError

from src.config import settings

pytestmark = pytest.mark.db


@pytest.fixture(scope="module")
def app_engine() -> Iterator[Engine]:
    """アプリ用ロールの接続（`DATABASE_URL`）"""
    engine = create_engine(settings.database_url)
    yield engine
    engine.dispose()


@pytest.fixture(scope="module")
def migrator_engine() -> Iterator[Engine]:
    """所有者ロールの接続（`MIGRATION_DATABASE_URL`）"""
    engine = create_engine(settings.migration_database_url)
    yield engine
    engine.dispose()


def test_the_two_urls_use_different_roles() -> None:
    """
    設定が同じロールを指していないこと。

    ここが同じなら以下のテストは «分離できている» と言えないまま緑になる。
    """
    with (
        create_engine(settings.database_url).connect() as app_conn,
        create_engine(settings.migration_database_url).connect() as migrator_conn,
    ):
        app_role = app_conn.execute(text("SELECT current_user")).scalar_one()
        migrator_role = migrator_conn.execute(text("SELECT current_user")).scalar_one()

    assert app_role != migrator_role


def test_the_app_role_cannot_create_tables(app_engine: Engine) -> None:
    """DDL は所有者ロールだけの仕事。アプリ用ロールは public スキーマに CREATE を持たない"""
    with app_engine.connect() as conn, pytest.raises(ProgrammingError, match="permission denied"):
        conn.execute(text("CREATE TABLE probe_should_not_exist (id int)"))


def test_the_app_role_can_write_rows(app_engine: Engine) -> None:
    """
    分離のもう半分。DML は通らないと業務が動かない。

    0000 の ALTER DEFAULT PRIVILEGES が効いていれば、所有者が後から作った
    テーブルにも権限が付いている。
    """
    with app_engine.begin() as conn:
        conn.execute(text("INSERT INTO items (name) VALUES ('role probe')"))
        conn.execute(text("DELETE FROM items WHERE name = 'role probe'"))


def test_the_app_role_cannot_write_the_migration_version(app_engine: Engine) -> None:
    """
    `alembic_version` はマイグレーションの状態そのもの。

    0000 が `GRANT ON ALL TABLES` の副作用を剥がしている。書けてしまうと、
    アプリ側の事故で «移行済みに見える DB» を作れる。
    """
    with app_engine.connect() as conn, pytest.raises(ProgrammingError, match="permission denied"):
        conn.execute(text("UPDATE alembic_version SET version_num = '0000'"))


def test_the_app_role_can_read_the_migration_version(app_engine: Engine) -> None:
    """
    起動時の版の検査（`src/schema_guard.py`）がアプリ用の接続で版を読む。

    0002 が SELECT だけを返している。剥がれるとアプリは «判定できない» として起動を拒む。
    """
    with app_engine.connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()

    assert version


def test_the_migrator_role_owns_the_tables(migrator_engine: Engine) -> None:
    """所有者が別ロールだと DDL のたびに権限の付け替えが要る。ここが崩れると 0000 の既定権限も効かない"""
    with migrator_engine.connect() as conn:
        owner = conn.execute(
            text("SELECT tableowner FROM pg_tables WHERE tablename = 'items'"),
        ).scalar_one()
        current = conn.execute(text("SELECT current_user")).scalar_one()

    assert owner == current
