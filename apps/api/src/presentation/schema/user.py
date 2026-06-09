from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class UserCreateRequest(BaseModel):
    name: str = Field(max_length=50)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("空白のみのお名前は使用できません")
        return v


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    updated_at: datetime
