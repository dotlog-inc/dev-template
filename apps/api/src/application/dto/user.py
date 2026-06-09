from dataclasses import dataclass


@dataclass
class RegisterUserDTO:
    uid: str
    email: str
    name: str


@dataclass
class GetUserDTO:
    uid: str
