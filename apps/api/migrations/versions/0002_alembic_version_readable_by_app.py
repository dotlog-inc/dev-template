"""grant SELECT on alembic_version to the app role

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-26 00:00:00.000000

api が起動時に DB の版を確かめる（`src/schema_guard.py`）。移行は手動で流すため、
流し忘れた DB に新しいコードが載るのを起動の時点で止めるため。

`0000` は `REVOKE ALL ON TABLE alembic_version` で全権限を剥がした。理由は
「マイグレーション状態をアプリ用ロールが書き換えられる必要はない」で、**返すのは SELECT だけ**
なのでこの理由とは食い違わない。書き込みが混ざらないことは
`tests/test_db_roles.py::test_the_app_role_cannot_write_the_migration_version` が見る。

**配備より先に流す。** 流す前に起動時検査入りの image を配ると、アプリ用ロールが版を読めずに
起動を拒む（旧 revision のまま動き続けるが、配備は効かない）。
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ロール名は 0000 と同じ規則で DB 名から導く
    op.execute("""
        DO $$
        BEGIN
            EXECUTE format(
                'GRANT SELECT ON TABLE alembic_version TO %I',
                current_database() || '_app'
            );
        END
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            EXECUTE format(
                'REVOKE SELECT ON TABLE alembic_version FROM %I',
                current_database() || '_app'
            );
        END
        $$;
    """)
