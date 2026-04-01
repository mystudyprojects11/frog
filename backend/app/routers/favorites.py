import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.favorite import Favorite
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingShort
from app.utils.auth import get_current_user
from app.utils.s3 import public_url

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/", response_model=list[ListingShort])
async def get_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.species), selectinload(Listing.photos))
        .join(Favorite, Favorite.listing_id == Listing.id)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
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


@router.post("/{listing_id}", status_code=201)
async def add_favorite(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Listing not found")

    existing = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.listing_id == listing_id)
    )
    if existing.scalar_one_or_none():
        return {"detail": "Already in favorites"}

    db.add(Favorite(user_id=current_user.id, listing_id=listing_id))
    await db.commit()
    return {"detail": "Added"}


@router.delete("/{listing_id}", status_code=204)
async def remove_favorite(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(Favorite).where(Favorite.user_id == current_user.id, Favorite.listing_id == listing_id)
    )
    await db.commit()
