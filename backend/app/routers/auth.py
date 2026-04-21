from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingShort
from app.schemas.user import PasswordChange, Token, UserCreate, UserRead
from app.utils.auth import create_access_token, get_current_user, hash_password, verify_password
from app.utils.s3 import delete_file, key_from_url, public_url, upload_file

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.email == data.email) | (User.username == data.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already taken")

    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
        phone=data.phone,
        city=data.city,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"username", "phone", "city"}
    for field, value in data.items():
        if field in allowed:
            setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.avatar_url:
        old_key = key_from_url(current_user.avatar_url)
        if old_key:
            try:
                delete_file(old_key)
            except Exception:
                pass

    key = upload_file(await file.read(), file.content_type or "image/jpeg", folder="avatars")
    current_user.avatar_url = public_url(key)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserRead)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.avatar_url:
        old_key = key_from_url(current_user.avatar_url)
        if old_key:
            try:
                delete_file(old_key)
            except Exception:
                pass
        current_user.avatar_url = None
        await db.commit()
        await db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=204)
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()


@router.get("/me/listings", response_model=list[ListingShort])
async def my_listings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.species), selectinload(Listing.photos))
        .where(Listing.seller_id == current_user.id)
        .order_by(Listing.created_at.desc())
    )
    listings = result.scalars().all()
    items = []
    for listing in listings:
        main_photo = next((p for p in listing.photos if p.is_main), None) or (
            listing.photos[0] if listing.photos else None
        )
        items.append(
            ListingShort(
                **{
                    k: getattr(listing, k)
                    for k in ("id", "title", "price", "deal_type", "status", "city", "created_at", "seller_id")
                },
                species=listing.species,
                main_photo=public_url(main_photo.s3_key) if main_photo else None,
            )
        )
    return items
