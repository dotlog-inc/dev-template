from dataclasses import dataclass


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
    body: str | None
