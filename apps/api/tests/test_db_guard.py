"""
接続してよい DB かの判定（`src/db_guard.py`）。

**通ってしまう側を重点的に見る。** 拒否が壊れても機能は動くので、テストが無ければ
「本番へ繋がるようになっていた」と分かるのは事故のときになる。
"""

import re

import pytest

from src.db_guard import (
    DEFAULT_ALLOWED_HOSTS,
    DatabaseHostNotAllowedError,
    ensure_connectable,
    parse_allowed_hosts,
)

LOCAL_URL = "postgresql+psycopg://app:pw@localhost:5432/devtemplate"
PROD_URL = "postgresql+psycopg://app:pw@10.1.2.3:5432/devtemplate"


def test_no_declaration_means_local_only() -> None:
    """空の宣言は「手元の DB だけ」。名乗らない環境が本番を見られない側の既定値"""
    assert parse_allowed_hosts("") == DEFAULT_ALLOWED_HOSTS
    assert parse_allowed_hosts("   ") == DEFAULT_ALLOWED_HOSTS


def test_a_declaration_replaces_the_default() -> None:
    """
    **既定に足さず置き換える。**

    本番が名乗ったら本番の DB だけを見てよい、という宣言にするため。
    `localhost` が暗黙に混ざり続けると、本番の env を流用した手元の実行が通ってしまう。
    """
    hosts = parse_allowed_hosts("db.internal")

    assert hosts == frozenset({"db.internal"})
    assert "localhost" not in hosts


@pytest.mark.parametrize("raw", ["DB.Internal", " db.internal , ", "db.internal,,"])
def test_a_declaration_is_normalized(raw: str) -> None:
    """大小・空白・空要素で宣言が崩れないこと（ホスト名は大小を区別しない）"""
    assert parse_allowed_hosts(raw) == frozenset({"db.internal"})


def test_a_local_host_passes_without_a_declaration() -> None:
    ensure_connectable(database_url=LOCAL_URL, allowed_hosts="")


def test_a_declared_host_passes() -> None:
    ensure_connectable(database_url=PROD_URL, allowed_hosts="10.1.2.3")


def test_an_undeclared_host_is_rejected() -> None:
    """本番以外から本番 DB へ繋ごうとした状態。ここが本番"""
    with pytest.raises(DatabaseHostNotAllowedError, match=re.escape("10.1.2.3")):
        ensure_connectable(database_url=PROD_URL, allowed_hosts="")


def test_a_local_host_is_rejected_once_another_host_is_declared() -> None:
    """本番の env をそのまま持ってきた手元の実行が、逆方向でも止まること"""
    with pytest.raises(DatabaseHostNotAllowedError, match="localhost"):
        ensure_connectable(database_url=LOCAL_URL, allowed_hosts="10.1.2.3")


def test_a_lookalike_host_is_rejected() -> None:
    """
    部分一致で判定していないこと。

    `localhost.example.com` は攻撃というより設定ミスの形だが、通せば本番の隣の DB へ
    繋がる余地が残る。
    """
    with pytest.raises(DatabaseHostNotAllowedError):
        ensure_connectable(
            database_url="postgresql+psycopg://app:pw@localhost.example.com:5432/devtemplate",
            allowed_hosts="",
        )


def test_a_url_without_a_host_is_rejected() -> None:
    """ホストの無い URL（ソケット接続など）は「どこへ繋ぐか」が読めないので通さない"""
    with pytest.raises(DatabaseHostNotAllowedError, match="ホストがありません"):
        ensure_connectable(database_url="postgresql+psycopg:///devtemplate", allowed_hosts="")
