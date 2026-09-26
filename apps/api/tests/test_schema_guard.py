"""
起動時の版の検査（`src/schema_guard.py`）。

DB には繋がない。`judge()` を純関数として切っているのは、**4 つの分岐（一致・DB が古い・
DB が新しい・判定不能）をここで全部踏める**ようにするため。実 DB でこれを作るには
版を巻き戻したり壊したりする必要がある。
"""

from pathlib import Path

import pytest

from src.schema_guard import (
    MIGRATIONS_DIR,
    SchemaNotReadyError,
    SchemaVerdict,
    image_revisions,
    judge,
)

KNOWN = frozenset({"0000", "0001", "0002"})


def test_the_image_reports_a_single_head() -> None:
    """本番の履歴。head が 1 つでなければ、どの版まで上げるべきかが決まらない"""
    head, known = image_revisions()

    assert head in known
    assert len(known) >= 1


def test_the_migrations_directory_is_found_from_the_module() -> None:
    """
    起動ディレクトリに依存しないこと。

    runtime image は `/app` で動くが、`alembic.ini` の `script_location` は相対パス。
    """
    assert MIGRATIONS_DIR.is_dir()
    assert (MIGRATIONS_DIR / "versions").is_dir()


def test_a_matching_version_starts() -> None:
    assert judge(db_versions=["0002"], head="0002", known=KNOWN) is SchemaVerdict.CURRENT


def test_an_older_database_is_refused() -> None:
    """移行の流し忘れ。起動を止める以外の出方（列が無いテーブルへの 500）は遅すぎる"""
    with pytest.raises(SchemaNotReadyError, match="より古い"):
        judge(db_versions=["0001"], head="0002", known=KNOWN)


def test_a_newer_database_starts() -> None:
    """
    **切り戻しは正常な運用。**

    移行済みの DB で旧版の image を動かすのがそれで、ここで止めると切り戻しまで止まる。
    このイメージの履歴に無い版は「もっと新しい移行が流れている」としか読めない。
    """
    verdict = judge(db_versions=["0009"], head="0002", known=KNOWN)

    assert verdict is SchemaVerdict.DB_AHEAD


@pytest.mark.parametrize("rows", [[], ["0001", "0002"]])
def test_an_unreadable_version_is_refused(rows: list[str]) -> None:
    """判定できないなら通さない（空 = 未適用、複数行 = 分岐した履歴の適用跡）"""
    with pytest.raises(SchemaNotReadyError, match="1 行ではない"):
        judge(db_versions=rows, head="0002", known=KNOWN)


def test_a_branched_image_history_is_refused(tmp_path: Path) -> None:
    """
    分岐した履歴を持つ image は拒む —— head が 2 つある image は、どこまで上げるべきかをそもそも言えない。

    `tests/test_migration_heads.py` が CI で止めるが、検査側も «判定できないなら通さない» に倒す。
    """
    versions = tmp_path / "versions"
    versions.mkdir()
    for revision, down in (("0001", None), ("0002", "0001"), ("0002_again", "0001")):
        body = f'revision: str = "{revision}"\ndown_revision: str | None = {down!r}\n'
        (versions / f"{revision}.py").write_text(body, encoding="utf-8")

    with pytest.raises(SchemaNotReadyError, match="head が 1 つではない"):
        image_revisions(tmp_path)
