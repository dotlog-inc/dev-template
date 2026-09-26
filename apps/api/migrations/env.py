from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from src.config import settings
from src.models import *  # noqa: F403  (テーブル定義を import して SQLModel.metadata に登録)

config = context.config
# DDL を流すので所有者ロールの接続を使う（アプリ用ロールでは CREATE できない）
config.set_main_option("sqlalchemy.url", settings.migration_database_url)

# CLI（`mise run db:migrate`）から来たときだけログを設定する。
# `fileConfig` はプロセス全体の logging を alembic.ini の内容で置き換えるため、
# pytest から呼ぶと pytest 側のログ設定まで巻き込む。
# 呼び出し側が configure_logger=False を渡したときは触らない。
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
