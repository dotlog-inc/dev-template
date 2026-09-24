"""
CORS の設定ミスを起動時に落とす（`src/config.py`）。

`main.py` は常に `allow_credentials=True` で CORS を組む。`*` が混ざると credential 付きの
全開放になり、**ブラウザからは «動いている» ように見えるので気づけない。**
"""

import pytest
from pydantic import ValidationError

from src.config import Settings


def test_a_plain_origin_is_accepted() -> None:
    """検査が通常の設定を邪魔しないこと"""
    settings = Settings(cors_origins="http://localhost:3000,https://example.com")

    assert settings.cors_origin_list == ["http://localhost:3000", "https://example.com"]


@pytest.mark.parametrize("origins", ["*", "http://localhost:3000,*", "https://*.example.com"])
def test_a_wildcard_origin_is_rejected(origins: str) -> None:
    """
    部分ワイルドカードも拒否する。

    `allow_origins` は完全一致でしか見ないため、`https://*.example.com` は
    «サブドメインを許す» のではなく «その文字列と一致する origin だけを許す» になる。
    意図どおりに動かない設定は、設定ミスとして落とす。
    """
    with pytest.raises(ValidationError, match="ワイルドカード"):
        Settings(cors_origins=origins)
