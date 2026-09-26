"""
マイグレーションの分岐を、マージした後ではなくテストで止める。

**番号の衝突は、衝突した両方のブランチでは緑になる。** 別々のブランチが同じ revision を
取っても、それぞれの中では head が 1 つで矛盾が無い。矛盾が現れるのはマージした瞬間で、
そのときレビューは終わっている。

**`alembic history` では見つからない。** `walk_revisions()` は重複した revision の片方しか
辿らないので履歴は正常に見える（警告は標準エラーへ流れるだけ）。分岐が値として現れるのは
`get_heads()` だけなので、そこを見る。

alembic の設定を読むだけで DB を触らない。
"""

from pathlib import Path
from typing import Final

from alembic.config import Config
from alembic.script import ScriptDirectory

API_ROOT: Final = Path(__file__).resolve().parent.parent
BRANCHED_HEAD_COUNT: Final = 2


def _heads(script_location: Path) -> list[str]:
    """
    その履歴の head。**分岐していれば 2 つ以上返る。**

    `alembic.ini` の `script_location` は相対パスなので、pytest の起動ディレクトリに
    依存させないため上書きする。
    """
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(script_location))
    return ScriptDirectory.from_config(config).get_heads()


def _write_revision(versions: Path, revision: str, down_revision: str | None) -> None:
    """
    検査を試すための最小の版。

    `upgrade()` / `downgrade()` を書かないのは、`get_heads()` が読むのが
    `revision` と `down_revision` だけだから。
    """
    body = f'revision: str = "{revision}"\ndown_revision: str | None = {down_revision!r}\n'
    (versions / f"{revision}.py").write_text(body, encoding="utf-8")


def test_a_branched_history_is_detected(tmp_path: Path) -> None:
    """検査そのものが機能していること。これが緑にならないと本体の緑に意味がない"""
    versions = tmp_path / "versions"
    versions.mkdir()
    _write_revision(versions, "0001", None)
    _write_revision(versions, "0002", "0001")
    # 同じ親を持つ 2 本目（別々のブランチが同じ番号を取った状態）
    _write_revision(versions, "0002_again", "0001")

    assert len(_heads(tmp_path)) == BRANCHED_HEAD_COUNT


def test_the_migration_history_has_a_single_head() -> None:
    """本番の履歴。分岐していたら、どの版へ upgrade するかが決まらない"""
    assert len(_heads(API_ROOT / "migrations")) == 1
