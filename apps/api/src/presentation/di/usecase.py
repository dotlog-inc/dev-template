from typing import Annotated

from fastapi import Depends

from src.application.usecase.create_memo import CreateMemoUseCase
from src.application.usecase.delete_memo import DeleteMemoUseCase
from src.application.usecase.get_memo import GetMemoUseCase
from src.application.usecase.get_user import GetUserUseCase
from src.application.usecase.list_memos import ListMemosUseCase
from src.application.usecase.register_user import RegisterUserUseCase
from src.application.usecase.update_memo import UpdateMemoUseCase
from src.infrastructure.database.repositories.sql_memo_repository import SqlMemoRepository
from src.infrastructure.database.repositories.sql_user_repository import SqlUserRepository
from src.presentation.di.database import SessionDep


def get_register_user_usecase(session: SessionDep) -> RegisterUserUseCase:
    return RegisterUserUseCase(SqlUserRepository(session))


def get_get_user_usecase(session: SessionDep) -> GetUserUseCase:
    return GetUserUseCase(SqlUserRepository(session))


def get_list_memos_usecase(session: SessionDep) -> ListMemosUseCase:
    return ListMemosUseCase(SqlMemoRepository(session))


def get_create_memo_usecase(session: SessionDep) -> CreateMemoUseCase:
    return CreateMemoUseCase(SqlMemoRepository(session))


def get_get_memo_usecase(session: SessionDep) -> GetMemoUseCase:
    return GetMemoUseCase(SqlMemoRepository(session))


def get_update_memo_usecase(session: SessionDep) -> UpdateMemoUseCase:
    return UpdateMemoUseCase(SqlMemoRepository(session))


def get_delete_memo_usecase(session: SessionDep) -> DeleteMemoUseCase:
    return DeleteMemoUseCase(SqlMemoRepository(session))


RegisterUserUseCaseDep = Annotated[RegisterUserUseCase, Depends(get_register_user_usecase)]
GetUserUseCaseDep = Annotated[GetUserUseCase, Depends(get_get_user_usecase)]
ListMemosUseCaseDep = Annotated[ListMemosUseCase, Depends(get_list_memos_usecase)]
CreateMemoUseCaseDep = Annotated[CreateMemoUseCase, Depends(get_create_memo_usecase)]
GetMemoUseCaseDep = Annotated[GetMemoUseCase, Depends(get_get_memo_usecase)]
UpdateMemoUseCaseDep = Annotated[UpdateMemoUseCase, Depends(get_update_memo_usecase)]
DeleteMemoUseCaseDep = Annotated[DeleteMemoUseCase, Depends(get_delete_memo_usecase)]
