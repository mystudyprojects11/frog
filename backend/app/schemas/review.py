import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.user import UserRead


class ReviewCreate(BaseModel):
    seller_id: uuid.UUID
    rating: int
    text: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class ReviewRead(BaseModel):
    id: uuid.UUID
    rating: int
    text: str | None
    created_at: datetime
    reviewer: UserRead

    model_config = {"from_attributes": True}
