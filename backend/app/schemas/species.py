import uuid

from pydantic import BaseModel


class SpeciesCreate(BaseModel):
    name: str
    latin_name: str
    description: str | None = None
    difficulty: str = "medium"


class SpeciesRead(BaseModel):
    id: uuid.UUID
    name: str
    latin_name: str
    description: str | None
    difficulty: str
    photo_url: str | None

    model_config = {"from_attributes": True}
