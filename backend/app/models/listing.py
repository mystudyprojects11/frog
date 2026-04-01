import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Text, DateTime, Numeric, ForeignKey, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    deal_type: Mapped[str] = mapped_column(String(20), nullable=False)  # sale / exchange / free
    status: Mapped[str] = mapped_column(String(20), default="active")   # active / sold / archived
    city: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    species_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("species.id"), nullable=True)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    species: Mapped["Species"] = relationship(back_populates="listings")
    seller: Mapped["User"] = relationship(back_populates="listings")
    photos: Mapped[list["ListingPhoto"]] = relationship(back_populates="listing", cascade="all, delete-orphan")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="listing", cascade="all, delete-orphan")
    chats: Mapped[list["Chat"]] = relationship(back_populates="listing")


class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("listings.id"), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)

    listing: Mapped["Listing"] = relationship(back_populates="photos")
