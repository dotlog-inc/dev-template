# NOTE: PYTHON_VERSION は mise.toml / Dockerfile.dev と整合させること
ARG PYTHON_VERSION=3.14.3

FROM python:${PYTHON_VERSION}-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv

# uv は Astral 公式イメージから取得（pip ブートストラップ不要）
# NOTE: タグは mise.toml の uv バージョンと整合させること（patch まで固定）
COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /usr/local/bin/uv

WORKDIR /app

# 依存を先にインストールしてレイヤキャッシュを効かせる（コード変更で再 sync させない）
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY migrations/ ./migrations/
COPY src/ ./src/

FROM python:${PYTHON_VERSION}-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app/alembic.ini ./alembic.ini
COPY --from=builder /app/migrations/ ./migrations/
COPY --from=builder /app/src/ ./src/

EXPOSE 8080

CMD ["fastapi", "run", "src/main.py", "--host", "0.0.0.0", "--port", "8080"]
