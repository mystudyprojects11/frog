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


class ChatParticipant(BaseModel):
    id: uuid.UUID
    username: str
    avatar_url: str | None

    model_config = {"from_attributes": True}


class ChatListingInfo(BaseModel):
    id: uuid.UUID
    title: str
    main_photo: str | None = None


class ChatRead(BaseModel):
    id: uuid.UUID
    listing: ChatListingInfo
    buyer: ChatParticipant
    seller: ChatParticipant
    created_at: datetime
    last_message: MessageRead | None = None
    unread_count: int = 0


class WSMessage(BaseModel):
    text: str
