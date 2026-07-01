from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class MemoCreateRequest(BaseModel):
    title: str = Field(max_length=50)
    body: str | None = Field(default=None, max_length=5000)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("空白のみのタイトルは使用できません")
        return v


class MemoUpdateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=50)
    body: str | None = Field(default=None, max_length=5000)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("空白のみのタイトルは使用できません")
        return v


class MemoResponse(BaseModel):
    id: int
    title: str
    body: str | None
    user_id: str
    created_at: datetime
    updated_at: datetime


class MemoListItemResponse(BaseModel):
    id: int
    title: str
    body: str | None
    created_at: datetime
    updated_at: datetime
