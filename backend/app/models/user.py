import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Float, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    city: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    reviews_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    listings: Mapped[list["Listing"]] = relationship(back_populates="seller")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="user")
    reviews_received: Mapped[list["Review"]] = relationship(
        back_populates="seller", foreign_keys="Review.seller_id"
    )
    reviews_written: Mapped[list["Review"]] = relationship(
        back_populates="reviewer", foreign_keys="Review.reviewer_id"
    )
