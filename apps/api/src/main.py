from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import firebase_admin
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.presentation.exception_handlers import register_exception_handlers
from src.presentation.router import health, memos, users
from src.utils.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id})  # type: ignore[reportUnknownMemberType]
    yield


app = FastAPI(title="dev-template API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(users.router)
app.include_router(memos.router)
