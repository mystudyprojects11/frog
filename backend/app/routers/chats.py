import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal, get_db
from app.models.chat import Chat, Message
from app.models.listing import Listing
from app.models.user import User
from app.schemas.chat import ChatRead, MessageRead
from app.utils.auth import get_current_user

router = APIRouter(prefix="/chats", tags=["chats"])

# chat_id -> list of active websockets
_connections: dict[str, list[WebSocket]] = defaultdict(list)


@router.get("/", response_model=list[ChatRead])
async def list_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Chat)
        .where((Chat.buyer_id == current_user.id) | (Chat.seller_id == current_user.id))
        .order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()

    items = []
    for chat in chats:
        last_msg = await db.execute(
            select(Message)
            .where(Message.chat_id == chat.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        items.append(ChatRead.model_validate(chat, update={"last_message": last_msg.scalar_one_or_none()}))
    return items


@router.post("/{listing_id}", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
async def create_or_get_chat(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")

    existing = await db.execute(
        select(Chat).where(Chat.listing_id == listing_id, Chat.buyer_id == current_user.id)
    )
    chat = existing.scalar_one_or_none()
    if chat:
        return chat

    chat = Chat(listing_id=listing_id, buyer_id=current_user.id, seller_id=listing.seller_id)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


@router.get("/{chat_id}/messages", response_model=list[MessageRead])
async def get_messages(
    chat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if current_user.id not in (chat.buyer_id, chat.seller_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    msgs = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at)
    )
    return msgs.scalars().all()


@router.websocket("/{chat_id}/ws")
async def chat_ws(chat_id: str, websocket: WebSocket, token: str):
    from app.utils.auth import get_current_user as _get_user
    from fastapi.security import OAuth2PasswordBearer
    from jose import JWTError, jwt
    from app.core.config import settings
    import uuid as _uuid

    await websocket.accept()

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = _uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        await websocket.close(code=4001)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Chat).where(Chat.id == _uuid.UUID(chat_id)))
        chat = result.scalar_one_or_none()
        if not chat or user_id not in (chat.buyer_id, chat.seller_id):
            await websocket.close(code=4003)
            return

    _connections[chat_id].append(websocket)
    try:
        while True:
            text = await websocket.receive_text()
            if not text.strip():
                continue

            async with AsyncSessionLocal() as db:
                msg = Message(chat_id=_uuid.UUID(chat_id), sender_id=user_id, text=text)
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

            payload = MessageRead.model_validate(msg).model_dump_json()
            dead = []
            for ws in _connections[chat_id]:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                _connections[chat_id].remove(ws)

    except WebSocketDisconnect:
        _connections[chat_id].remove(websocket)
