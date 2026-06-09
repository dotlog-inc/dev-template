from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.domain.exceptions import ConflictError, NotFoundError, UnauthorizedError
from src.presentation.schema.error import ErrorDetail, ErrorResponse


def _json(response: ErrorResponse) -> JSONResponse:
    return JSONResponse(status_code=response.status, content=response.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(_req: Request, exc: UnauthorizedError) -> JSONResponse:
        return _json(
            ErrorResponse(
                title="Unauthorized",
                status=status.HTTP_401_UNAUTHORIZED,
                errors=[ErrorDetail(message=str(exc))],
            )
        )

    @app.exception_handler(NotFoundError)
    async def not_found_handler(_req: Request, exc: NotFoundError) -> JSONResponse:
        return _json(
            ErrorResponse(
                title="Not Found",
                status=status.HTTP_404_NOT_FOUND,
                errors=[ErrorDetail(message=str(exc))],
            )
        )

    @app.exception_handler(ConflictError)
    async def conflict_handler(_req: Request, exc: ConflictError) -> JSONResponse:
        return _json(
            ErrorResponse(
                title="Conflict",
                status=status.HTTP_409_CONFLICT,
                errors=[ErrorDetail(message=str(exc))],
            )
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_req: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            ErrorDetail(
                field=".".join(str(loc) for loc in e["loc"] if loc != "body"),
                message=e["msg"],
            )
            for e in exc.errors()
        ]
        return _json(
            ErrorResponse(
                title="Unprocessable Entity",
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                errors=errors,
            )
        )
