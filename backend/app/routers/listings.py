import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.listing import Listing, ListingPhoto
from app.models.user import User
from app.schemas.listing import ListingCreate, ListingRead, ListingShort, ListingUpdate
from app.utils.auth import get_current_user
from app.utils.s3 import delete_file, public_url, upload_file

router = APIRouter(prefix="/listings", tags=["listings"])

_load_full = [
    selectinload(Listing.seller),
    selectinload(Listing.species),
    selectinload(Listing.photos),
]


@router.get("/", response_model=list[ListingShort])
async def list_listings(
    deal_type: str | None = Query(None),
    city: str | None = Query(None),
    species_id: uuid.UUID | None = Query(None),
    status: Literal["active", "sold", "archived"] = Query("active"),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Listing)
        .options(selectinload(Listing.species), selectinload(Listing.photos))
        .where(Listing.status == status)
        .order_by(Listing.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if deal_type:
        q = q.where(Listing.deal_type == deal_type)
    if city:
        q = q.where(Listing.city.ilike(f"%{city}%"))
    if species_id:
        q = q.where(Listing.species_id == species_id)

    result = await db.execute(q)
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


@router.get("/{listing_id}", response_model=ListingRead)
async def get_listing(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Listing).options(*_load_full).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("/", response_model=ListingRead, status_code=201)
async def create_listing(
    data: ListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = Listing(**data.model_dump(), seller_id=current_user.id)
    db.add(listing)
    await db.commit()

    result = await db.execute(select(Listing).options(*_load_full).where(Listing.id == listing.id))
    return result.scalar_one()


@router.patch("/{listing_id}", response_model=ListingRead)
async def update_listing(
    listing_id: uuid.UUID,
    data: ListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    await db.commit()

    result = await db.execute(select(Listing).options(*_load_full).where(Listing.id == listing_id))
    return result.scalar_one()


@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Listing).options(selectinload(Listing.photos)).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    for photo in listing.photos:
        delete_file(photo.s3_key)
    await db.delete(listing)
    await db.commit()


@router.post("/{listing_id}/photos", response_model=ListingRead, status_code=201)
async def upload_photo(
    listing_id: uuid.UUID,
    file: UploadFile = File(...),
    is_main: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Listing).options(*_load_full).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if is_main:
        for p in listing.photos:
            p.is_main = False

    key = upload_file(await file.read(), file.content_type or "image/jpeg")
    photo = ListingPhoto(listing_id=listing_id, s3_key=key, is_main=is_main or not listing.photos)
    db.add(photo)
    await db.commit()

    result = await db.execute(select(Listing).options(*_load_full).where(Listing.id == listing_id))
    return result.scalar_one()


@router.patch("/{listing_id}/photos/{photo_id}/set-main", response_model=ListingRead)
async def set_main_photo(
    listing_id: uuid.UUID,
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Listing).options(*_load_full).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not any(p.id == photo_id for p in listing.photos):
        raise HTTPException(status_code=404, detail="Photo not found")

    for p in listing.photos:
        p.is_main = p.id == photo_id
    await db.commit()

    result = await db.execute(select(Listing).options(*_load_full).where(Listing.id == listing_id))
    return result.scalar_one()


@router.delete("/{listing_id}/photos/{photo_id}", status_code=204)
async def delete_photo(
    listing_id: uuid.UUID,
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing or listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(ListingPhoto).where(ListingPhoto.id == photo_id, ListingPhoto.listing_id == listing_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    delete_file(photo.s3_key)
    await db.delete(photo)
    await db.commit()
