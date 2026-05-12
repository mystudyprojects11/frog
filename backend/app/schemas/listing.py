import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, computed_field

from app.schemas.species import SpeciesRead
from app.schemas.user import UserRead
from app.utils.s3 import public_url


class ListingPhotoRead(BaseModel):
    id: uuid.UUID
    s3_key: str
    is_main: bool

    @computed_field
    @property
    def url(self) -> str:
        return public_url(self.s3_key)

    model_config = {"from_attributes": True}


class ListingCreate(BaseModel):
    title: str
    description: str | None = None
    price: Decimal | None = None
    deal_type: str  # sale / exchange / free
    city: str | None = None
    species_id: uuid.UUID | None = None


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: Decimal | None = None
    deal_type: str | None = None
    city: str | None = None
    species_id: uuid.UUID | None = None
    status: str | None = None


class ListingRead(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    price: Decimal | None
    deal_type: str
    status: str
    city: str | None
    created_at: datetime
    species: SpeciesRead | None
    seller: UserRead
    photos: list[ListingPhotoRead]

    model_config = {"from_attributes": True}


class ListingShort(BaseModel):
    id: uuid.UUID
    title: str
    price: Decimal | None
    deal_type: str
    status: str
    city: str | None
    created_at: datetime
    species: SpeciesRead | None
    seller_id: uuid.UUID
    main_photo: str | None = None

    model_config = {"from_attributes": True}
