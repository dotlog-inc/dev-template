from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # アプリ用。DML だけを持ち、DDL は実行できないロール
    database_url: str = "postgresql+psycopg://devtemplate_app:devtemplate_app@localhost:5432/devtemplate"
    # マイグレーション用。テーブル所有者となり DDL を実行するロール。
    # **ランタイム（api）へは渡さない** —— プロセスが所有者権限を持つと分離がプロセス内で消える
    migration_database_url: str = (
        "postgresql+psycopg://devtemplate_migrator:devtemplate_migrator@localhost:5432/devtemplate"
    )
    # この環境が繋いでよい DB のホスト（#30）。カンマ区切り。**空は「手元の DB だけ」**で、
    # 本番だけが自分の DB ホストを名乗る。打ち消しフラグにしないのは、立て忘れが素通りになるため。
    # 判定は `src/db_guard.py`、掛かるのは `src/db.py` を通る経路だけ（alembic は通らない）
    db_allowed_hosts: str = ""
    cors_origins: str = "http://localhost:3000"

    @field_validator("cors_origins")
    @classmethod
    def _reject_wildcard_origins(cls, value: str) -> str:
        """
        `*` を含む origin を起動時に落とす。

        `main.py` は常に `allow_credentials=True` で CORS を組むため、`*` が混ざると
        credential 付きの全開放になる。CORSMiddleware の `allow_origins` は完全一致でしか
        見ないので、`https://*.example.com` のような部分ワイルドカードも設定ミスとして拒否する。
        """
        wildcards = [o.strip() for o in value.split(",") if "*" in o]
        if wildcards:
            msg = f"CORS_ORIGINS にワイルドカードは置けません（credential 付きで全開放になる）: {', '.join(wildcards)}"
            raise ValueError(msg)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
