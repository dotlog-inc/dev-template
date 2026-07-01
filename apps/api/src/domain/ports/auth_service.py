from dataclasses import dataclass
from typing import Protocol


@dataclass
class AuthIdentity:
    uid: str
    email: str


class AuthService(Protocol):
    def verify_token(self, token: str) -> AuthIdentity: ...
