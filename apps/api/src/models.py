from datetime import datetime
from typing import ClassVar

from sqlalchemy import Column, DateTime, func
from sqlmodel import Field, SQLModel


class ItemBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)


class Item(ItemBase, table=True):
    __tablename__: ClassVar[str] = "items"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )


class ItemCreate(ItemBase):
    pass


class ItemPublic(ItemBase):
    id: int
    created_at: datetime
