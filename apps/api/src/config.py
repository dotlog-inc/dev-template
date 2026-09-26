from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    database_url: str = "postgresql+psycopg://app:app@localhost:5432/app"
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
