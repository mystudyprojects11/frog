import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewRead
from app.utils.auth import get_current_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/seller/{seller_id}", response_model=list[ReviewRead])
async def get_reviews(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.reviewer))
        .where(Review.seller_id == seller_id)
        .order_by(Review.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot review yourself")

    existing = await db.execute(
        select(Review).where(Review.seller_id == data.seller_id, Review.reviewer_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already reviewed this seller")

    review = Review(seller_id=data.seller_id, reviewer_id=current_user.id, rating=data.rating, text=data.text)
    db.add(review)
    await db.flush()

    # пересчитываем рейтинг продавца
    agg = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.seller_id == data.seller_id)
    )
    avg_rating, count = agg.one()
    await db.execute(
        update(User).where(User.id == data.seller_id).values(rating=round(avg_rating, 2), reviews_count=count)
    )

    await db.commit()
    await db.refresh(review)

    result = await db.execute(
        select(Review).options(selectinload(Review.reviewer)).where(Review.id == review.id)
    )
    return result.scalar_one()
