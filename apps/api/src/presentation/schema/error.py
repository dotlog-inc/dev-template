from pydantic import BaseModel


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    errors: list[ErrorDetail] = []
