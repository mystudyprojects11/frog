import uuid
from datetime import datetime

from pydantic import BaseModel


class MessageRead(BaseModel):
    id: uuid.UUID
    chat_id: uuid.UUID
    sender_id: uuid.UUID
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRead(BaseModel):
    id: uuid.UUID
    listing_id: uuid.UUID
    buyer_id: uuid.UUID
    seller_id: uuid.UUID
    created_at: datetime
    last_message: MessageRead | None = None

    model_config = {"from_attributes": True}


class WSMessage(BaseModel):
    text: str
