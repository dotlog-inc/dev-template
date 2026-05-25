from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Item

router = APIRouter(prefix="/items", tags=["items"])

SessionDep = Annotated[Session, Depends(get_session)]


class ItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ItemOut(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ItemOut])
def list_items(session: SessionDep) -> list[Item]:
    return list(session.scalars(select(Item).order_by(Item.id.desc())))


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemIn, session: SessionDep) -> Item:
    item = Item(name=payload.name)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item
