from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routes import health, items
from src.schema_guard import schema_lifespan

# **起動時に DB の版を確かめる**（`src/schema_guard.py`）。移行の流し忘れはここで起動ごと止まり、
# 起動に失敗した revision へは traffic が移らない
app = FastAPI(title="dev-template API", lifespan=schema_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(items.router)
