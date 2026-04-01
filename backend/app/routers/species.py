import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.species import Species
from app.models.user import User
from app.schemas.species import SpeciesCreate, SpeciesRead
from app.utils.auth import get_current_user
from app.utils.s3 import upload_file, public_url

router = APIRouter(prefix="/species", tags=["species"])


@router.get("/", response_model=list[SpeciesRead])
async def list_species(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Species).order_by(Species.name))
    return result.scalars().all()


@router.get("/{species_id}", response_model=SpeciesRead)
async def get_species(species_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Species).where(Species.id == species_id))
    species = result.scalar_one_or_none()
    if not species:
        raise HTTPException(status_code=404, detail="Species not found")
    return species


@router.post("/", response_model=SpeciesRead, status_code=status.HTTP_201_CREATED)
async def create_species(
    data: SpeciesCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    species = Species(**data.model_dump())
    db.add(species)
    await db.commit()
    await db.refresh(species)
    return species


@router.post("/{species_id}/photo", response_model=SpeciesRead)
async def upload_species_photo(
    species_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Species).where(Species.id == species_id))
    species = result.scalar_one_or_none()
    if not species:
        raise HTTPException(status_code=404, detail="Species not found")

    key = upload_file(await file.read(), file.content_type or "image/jpeg", folder="species")
    species.photo_url = public_url(key)
    await db.commit()
    await db.refresh(species)
    return species
