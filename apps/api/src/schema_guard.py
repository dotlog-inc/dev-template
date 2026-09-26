"""
起動時に DB の版を確かめる（#30）。

**移行は手動で流す前提。** 流し忘れた DB に新しいコードが載ると、列の無いテーブルへ書いて
500 を返す。それを**起動の時点で理由付きで止める。** 起動に失敗した revision へは traffic が
移らないので、失敗の出方は「配備が効かない」であって「動いている本番が落ちる」ではない
（`src/db_guard.py` と同じ）。

**DB の方が新しいときは通す。** 移行済みの DB で旧版を動かすのは切り戻しの正常な形で、
「版が違えば止める」と書くと切り戻しまで止まる。
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from enum import StrEnum
from pathlib import Path
from typing import Final

from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import FastAPI
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import NullPool

from src.config import settings
from src.db_guard import ensure_connectable

logger = logging.getLogger(__name__)

# DB に繋がらないまま起動が止まり続けないようにする。起動プローブより十分短く
CONNECT_TIMEOUT_SECONDS: Final = 10


class SchemaNotReadyError(RuntimeError):
    """DB の版がこのイメージの期待に届いていない、または判定できない"""


class SchemaVerdict(StrEnum):
    CURRENT = "current"
    DB_AHEAD = "db_ahead"


# runtime image は `/app/alembic.ini` と `/app/migrations/` を持つ（`apps/api/Dockerfile`）。
# 起動ディレクトリに依存させないため、このファイルからの相対で引く
API_ROOT: Final = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR: Final = API_ROOT / "migrations"


def image_revisions(script_location: Path = MIGRATIONS_DIR) -> tuple[str, frozenset[str]]:
    """
    このイメージが知っている版（head と、履歴に含まれる全 revision）。**DB には繋がない。**

    `alembic.ini` の `script_location` は相対パスなので上書きする。
    """
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(script_location))
    config.attributes["configure_logger"] = False
    script = ScriptDirectory.from_config(config)
    heads = script.get_heads()
    if len(heads) != 1:
        msg = f"このイメージのマイグレーションの head が 1 つではない: {heads}"
        raise SchemaNotReadyError(msg)
    known = frozenset(revision.revision for revision in script.walk_revisions())
    return heads[0], known


def judge(*, db_versions: list[str], head: str, known: frozenset[str]) -> SchemaVerdict:
    """
    起動してよいかを決める。拒むときは `SchemaNotReadyError` を投げる。

    `known` はこのイメージの `migrations/` にある全 revision。そこに無い版は
    「このイメージより新しい移行が流れている」としか読めない。
    """
    if len(db_versions) != 1:
        msg = f"alembic_version の行が 1 行ではない（{len(db_versions)} 行）。版を判定できない"
        raise SchemaNotReadyError(msg)
    (current,) = db_versions
    if current == head:
        return SchemaVerdict.CURRENT
    if current in known:
        msg = f"DB の版 {current} がこのイメージの head {head} より古い。移行を流してから配備し直す"
        raise SchemaNotReadyError(msg)
    return SchemaVerdict.DB_AHEAD


def read_db_versions(database_url: str) -> list[str]:
    """
    DB の版を読む。**読めなければ `SchemaNotReadyError`**（判定できないなら通さない）。

    アプリの `src.db.engine` を使わない。起動時の 1 回だけのために接続タイムアウトを付けた
    使い捨てのエンジンを作り、プールを残さない。例外の本文に接続 URL を載せないため、
    元の例外は型名だけを引き継ぐ。
    """
    ensure_connectable(database_url=database_url, allowed_hosts=settings.db_allowed_hosts)
    engine = create_engine(
        database_url,
        poolclass=NullPool,
        connect_args={"connect_timeout": CONNECT_TIMEOUT_SECONDS},
    )
    try:
        with engine.connect() as conn:
            return list(conn.execute(text("SELECT version_num FROM alembic_version")).scalars())
    except SQLAlchemyError as error:
        # `DBAPIError` だけが `orig`（psycopg の例外）を持つ。型名だけを出し、本文は出さない
        cause = getattr(error, "orig", None) or error
        msg = f"DB の版を読めない（{type(cause).__name__}）。接続先・マイグレーションの適用・DB の稼働を確かめる"
        raise SchemaNotReadyError(msg) from None
    finally:
        engine.dispose()


def ensure_schema_ready(
    *,
    database_url: str | None = None,
    script_location: Path = MIGRATIONS_DIR,
) -> SchemaVerdict:
    """起動してよければ判定を返す。拒むときは `SchemaNotReadyError`"""
    head, known = image_revisions(script_location)
    db_versions = read_db_versions(database_url or settings.database_url)
    verdict = judge(db_versions=db_versions, head=head, known=known)
    if verdict is SchemaVerdict.DB_AHEAD:
        logger.warning(
            "DB の版 %s がこのイメージの head %s より新しい（切り戻し中とみなして起動する）",
            db_versions[0],
            head,
        )
    return verdict


@asynccontextmanager
async def schema_lifespan(_: FastAPI) -> AsyncGenerator[None]:
    """
    起動時に DB の版を確かめる。

    同期の DB 呼び出しをイベントループ上で行うが、起動前でリクエストを受けていないので
    ブロックして困るものが無い。

    NOTE: `TestClient` を context manager として使うと lifespan が走るため、そのテストは
          DB を要求する（`tests/test_health.py` は context manager にしていない）。
    """
    ensure_schema_ready()
    yield
