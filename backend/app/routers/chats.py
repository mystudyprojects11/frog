import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal, get_db
from app.models.chat import Chat, Message
from app.models.listing import Listing
from app.models.user import User
from app.schemas.chat import ChatListingInfo, ChatRead, MessageRead
from app.utils.auth import get_current_user
from app.utils.s3 import public_url

router = APIRouter(prefix="/chats", tags=["chats"])

_connections: dict[str, list[WebSocket]] = defaultdict(list)

_load_full = [
    selectinload(Chat.buyer),
    selectinload(Chat.seller),
    selectinload(Chat.listing).selectinload(Listing.photos),
]


async def _fetch_chat(db: AsyncSession, chat_id: uuid.UUID) -> Chat | None:
    result = await db.execute(select(Chat).options(*_load_full).where(Chat.id == chat_id))
    return result.scalar_one_or_none()


def _to_chat_read(chat: Chat, last_message: Message | None, unread_count: int = 0) -> ChatRead:
    photos = chat.listing.photos
    main_photo = next((p for p in photos if p.is_main), None) or (photos[0] if photos else None)
    return ChatRead(
        id=chat.id,
        listing=ChatListingInfo(
            id=chat.listing.id,
            title=chat.listing.title,
            main_photo=public_url(main_photo.s3_key) if main_photo else None,
        ),
        buyer=chat.buyer,
        seller=chat.seller,
        created_at=chat.created_at,
        last_message=MessageRead.model_validate(last_message) if last_message else None,
        unread_count=unread_count,
    )


async def _count_unread(db: AsyncSession, chat: Chat, user_id: uuid.UUID) -> int:
    if user_id == chat.buyer_id:
        last_read = chat.buyer_last_read_at
    elif user_id == chat.seller_id:
        last_read = chat.seller_last_read_at
    else:
        return 0
    result = await db.execute(
        select(func.count(Message.id)).where(
            Message.chat_id == chat.id,
            Message.sender_id != user_id,
            Message.created_at > last_read,
        )
    )
    return result.scalar_one() or 0


@router.get("/", response_model=list[ChatRead])
async def list_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Chat)
        .options(*_load_full)
        .where((Chat.buyer_id == current_user.id) | (Chat.seller_id == current_user.id))
        .order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()

    items = []
    for chat in chats:
        last = await db.execute(
            select(Message)
            .where(Message.chat_id == chat.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        unread = await _count_unread(db, chat, current_user.id)
        items.append(_to_chat_read(chat, last.scalar_one_or_none(), unread))
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
    if not chat:
        chat = Chat(listing_id=listing_id, buyer_id=current_user.id, seller_id=listing.seller_id)
        db.add(chat)
        await db.commit()

    full = await _fetch_chat(db, chat.id)
    last = await db.execute(
        select(Message).where(Message.chat_id == full.id).order_by(Message.created_at.desc()).limit(1)
    )
    return _to_chat_read(full, last.scalar_one_or_none())


@router.post("/{chat_id}/read", status_code=204)
async def mark_read(
    chat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if current_user.id == chat.buyer_id:
        chat.buyer_last_read_at = now
    elif current_user.id == chat.seller_id:
        chat.seller_last_read_at = now
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.commit()


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
    from jose import JWTError, jwt
    from app.core.config import settings

    await websocket.accept()

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        await websocket.close(code=4001)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Chat).where(Chat.id == uuid.UUID(chat_id)))
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
                msg = Message(chat_id=uuid.UUID(chat_id), sender_id=user_id, text=text)
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
        if websocket in _connections[chat_id]:
            _connections[chat_id].remove(websocket)
