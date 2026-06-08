from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, col, select

from src.db import get_session
from src.models import Item, ItemCreate, ItemPublic

router = APIRouter(prefix="/items", tags=["items"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[ItemPublic])
def list_items(session: SessionDep) -> list[Item]:
    return list(session.exec(select(Item).order_by(col(Item.id).desc())))


@router.post("", response_model=ItemPublic, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, session: SessionDep) -> Item:
    item = Item.model_validate(payload)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item
