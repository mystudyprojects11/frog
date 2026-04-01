import uuid

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Species(Base):
    __tablename__ = "species"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    latin_name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")  # easy / medium / hard
    photo_url: Mapped[str | None] = mapped_column(String(500))

    listings: Mapped[list["Listing"]] = relationship(back_populates="species")
