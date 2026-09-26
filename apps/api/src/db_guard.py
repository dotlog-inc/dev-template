"""
アプリが繋いでよい DB かの判定（#30）。

「Preview / 手元の環境が本番 DB を見ない」を、規約ではなく起動時の検査で守る。

**どの DB を見てよいかを環境の側が名乗る**形にした（`DB_ALLOWED_HOSTS`）。
名乗らなければ手元の DB しか見えない。`PREVIEW=true` のような打ち消しフラグにしないのは、
立て忘れがそのまま素通り（fail-open）になるため —— こちらは**書き忘れると届かなくなる**側へ倒れる。

**これは deploy 権限を持つ人への壁ではない。** env をまるごと本番から複製すれば
`DATABASE_URL` と `DB_ALLOWED_HOSTS` は一緒に付いてくる。止まるのは、手元の `.env` が
本番を向く / Preview の雛形で `DATABASE_URL` だけ流用する、といった**事故**の階級である。

**呼ばれるのは `src/db.py` だけ。** alembic は通らない（`migrations/env.py` は `src.config` と
`src.models` しか引かない）ので、移行を流す経路をこの検査で塞がない。
起動時に落ちてもコンテナオーケストレータは traffic を切り替えないので、失敗の出方は
「配備が効かない」であって「動いている本番が落ちる」ではない。
"""

from typing import Final

from sqlalchemy.engine import make_url

# 何も名乗らない環境が見てよい DB。ローカル開発と CI（`localhost`）、compose の `db`、
# Cloud SQL Auth Proxy などの `127.0.0.1`。
# **ここに本番のホストを足さない。** 本番は `DB_ALLOWED_HOSTS` で自分を名乗る側にいる
DEFAULT_ALLOWED_HOSTS: Final = frozenset({"localhost", "127.0.0.1", "db"})


class DatabaseHostNotAllowedError(RuntimeError):
    """許可されていない DB へ繋ごうとした"""


def parse_allowed_hosts(raw: str) -> frozenset[str]:
    """
    `DB_ALLOWED_HOSTS` を集合にする。空なら既定（手元の DB だけ）。

    **既定に足すのではなく置き換える。** 本番が名乗ったら本番の DB だけを見てよい、
    という宣言にしたいので、`localhost` が暗黙に混ざり続ける形にしない。
    """
    hosts = frozenset(host.strip().lower() for host in raw.split(",") if host.strip())
    return hosts or DEFAULT_ALLOWED_HOSTS


def ensure_connectable(*, database_url: str, allowed_hosts: str) -> None:
    """繋いでよくなければ `DatabaseHostNotAllowedError` を投げる。返り値は無い。"""
    allowed = parse_allowed_hosts(allowed_hosts)

    # 部分一致で判定しない。`localhost.example.com` のようなホスト名を通してしまう
    # （ホスト名は大小を区別しないので小文字へ揃えてから比べる）
    host = make_url(database_url).host
    if host is None:
        msg = "DATABASE_URL にホストがありません。接続先を明示してください"
        raise DatabaseHostNotAllowedError(msg)

    if host.lower() not in allowed:
        listed = " / ".join(sorted(allowed))
        msg = (
            f"接続先ホスト {host} は許可されていません。許可されるのは {listed} だけです"
            "（本番以外から本番 DB へ繋がないための検査。DB_ALLOWED_HOSTS で宣言する）"
        )
        raise DatabaseHostNotAllowedError(msg)
