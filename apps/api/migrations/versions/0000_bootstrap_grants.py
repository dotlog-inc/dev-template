"""grant DML on migrator-owned objects to the app role

Revision ID: 0000
Revises:
Create Date: 2026-09-26 00:00:00.000000

所有者ロール（`<db>_migrator`）が作るオブジェクトへ、アプリ用ロール（`<db>_app`）の DML を
自動で付ける。**これが無いとテーブルを追加するたびに GRANT 漏れが起きる。**

ロール名は設定で渡さず、接続中の DB 名から導く（`infra/sql/local/create-roles.sh` と同じ規則）。
所有者ロールは `current_user`（このマイグレーションを流している主体）そのもの。

NOTE: 0001 を適用済みの DB にこのリビジョンを後から挿しても alembic は実行しない。
      その場合はこのファイルの SQL を所有者ロールで手動実行すること。
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0000"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 既存オブジェクトへの権限。`quote_ident` を通すのは、DB 名に引用が要る文字が
    # 入っていても壊れないようにするため
    op.execute("""
        DO $$
        DECLARE
            app_role text := current_database() || '_app';
        BEGIN
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I',
                app_role
            );
            EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', app_role);

            -- 以降 current_user（所有者ロール）が作るオブジェクトへ自動で権限が付く
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
                current_user, app_role
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
                'GRANT USAGE, SELECT ON SEQUENCES TO %I',
                current_user, app_role
            );

            -- GRANT ON ALL TABLES は alembic_version も掴む。マイグレーション状態を
            -- アプリ用ロールが書き換えられる必要はないので剥がす。
            -- ALTER DEFAULT PRIVILEGES は以後の新規テーブルにしか効かないため巻き戻らない。
            EXECUTE format('REVOKE ALL ON TABLE alembic_version FROM %I', app_role);
        END
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        DECLARE
            app_role text := current_database() || '_app';
        BEGIN
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
                'REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM %I',
                current_user, app_role
            );
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
                'REVOKE USAGE, SELECT ON SEQUENCES FROM %I',
                current_user, app_role
            );
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', app_role);
            -- ALL TABLES に alembic_version も含まれるため、upgrade 側の個別 REVOKE は
            -- ここで包含される。戻し忘れではなく、権限を与え直さないのが正しい状態。
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', app_role);
        END
        $$;
    """)
