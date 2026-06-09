from dataclasses import dataclass
from datetime import datetime


@dataclass
class Memo:
    id: int  # 0 = 未永続化センチネル
    title: str
    body: str | None
    user_id: str
    created_at: datetime
    updated_at: datetime
