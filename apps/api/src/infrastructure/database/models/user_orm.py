from datetime import datetime
from typing import ClassVar

from sqlalchemy import Column, DateTime, func
from sqlmodel import Field, SQLModel


class UserOrm(SQLModel, table=True):
    __tablename__: ClassVar[str] = "users"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: str = Field(primary_key=True)
    name: str = Field(max_length=50)
    email: str = Field(unique=True)
    created_at: datetime = Field(
        default=None,  # pyright: ignore[reportArgumentType]
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
    updated_at: datetime = Field(
        default=None,  # pyright: ignore[reportArgumentType]
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
