from fastapi import APIRouter, status

from src.application.dto.memo import UNSET, CreateMemoDTO, UpdateMemoDTO
from src.domain.models.memo import Memo
from src.presentation.auth import CurrentUser
from src.presentation.di.usecase import (
    CreateMemoUseCaseDep,
    DeleteMemoUseCaseDep,
    GetMemoUseCaseDep,
    ListMemosUseCaseDep,
    UpdateMemoUseCaseDep,
)
from src.presentation.schema.memo import (
    MemoCreateRequest,
    MemoListItemResponse,
    MemoResponse,
    MemoUpdateRequest,
)

router = APIRouter(prefix="/memos", tags=["memos"])


def _to_response(memo: Memo) -> MemoResponse:
    return MemoResponse(
        id=memo.id,
        title=memo.title,
        body=memo.body,
        user_id=memo.user_id,
        created_at=memo.created_at,
        updated_at=memo.updated_at,
    )


def _to_list_item(memo: Memo) -> MemoListItemResponse:
    return MemoListItemResponse(
        id=memo.id,
        title=memo.title,
        body=memo.body,
        created_at=memo.created_at,
        updated_at=memo.updated_at,
    )


@router.get("", response_model=list[MemoListItemResponse])
def list_memos(current_user: CurrentUser, usecase: ListMemosUseCaseDep) -> list[MemoListItemResponse]:
    return [_to_list_item(m) for m in usecase.execute(current_user.id)]


@router.post("", response_model=MemoResponse, status_code=status.HTTP_201_CREATED)
def create_memo(
    payload: MemoCreateRequest,
    current_user: CurrentUser,
    usecase: CreateMemoUseCaseDep,
) -> MemoResponse:
    memo = usecase.execute(CreateMemoDTO(user_id=current_user.id, title=payload.title, body=payload.body))
    return _to_response(memo)


@router.get("/{memo_id}", response_model=MemoResponse)
def get_memo(memo_id: int, current_user: CurrentUser, usecase: GetMemoUseCaseDep) -> MemoResponse:
    return _to_response(usecase.execute(current_user.id, memo_id))


@router.patch("/{memo_id}", response_model=MemoResponse)
def update_memo(
    memo_id: int,
    payload: MemoUpdateRequest,
    current_user: CurrentUser,
    usecase: UpdateMemoUseCaseDep,
) -> MemoResponse:
    body = payload.body if "body" in payload.model_fields_set else UNSET
    memo = usecase.execute(UpdateMemoDTO(user_id=current_user.id, memo_id=memo_id, title=payload.title, body=body))
    return _to_response(memo)


@router.delete("/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memo(memo_id: int, current_user: CurrentUser, usecase: DeleteMemoUseCaseDep) -> None:
    usecase.execute(current_user.id, memo_id)
