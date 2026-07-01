from dataclasses import dataclass
from enum import Enum


class _Unset(Enum):
    UNSET = "unset"


# body(nullable)の未指定と明示的な null 指定(クリア)を区別するためのセンチネル
UNSET = _Unset.UNSET


@dataclass
class CreateMemoDTO:
    user_id: str
    title: str
    body: str | None


@dataclass
class UpdateMemoDTO:
    user_id: str
    memo_id: int
    title: str | None
    body: str | None | _Unset = UNSET
