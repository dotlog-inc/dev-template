from datetime import datetime
from typing import ClassVar

from sqlalchemy import Column, DateTime, ForeignKey, Text, func
from sqlmodel import Field, SQLModel


class MemoOrm(SQLModel, table=True):
    __tablename__: ClassVar[str] = "memos"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=50)
    body: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    user_id: str = Field(
        sa_column=Column(
            ForeignKey("users.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
    )
    created_at: datetime = Field(
        default=None,  # pyright: ignore[reportArgumentType]
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
    updated_at: datetime = Field(
        default=None,  # pyright: ignore[reportArgumentType]
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
