#!/usr/bin/env python3
"""
Seed species from iNaturalist — top-50 Anura (frogs & toads) by observations count.

Usage (from backend/ directory):
    python scripts/seed_species.py
"""

import asyncio
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.species import Species
from app.utils.s3 import ensure_bucket, public_url, upload_file

INATURALIST_URL = (
    "https://api.inaturalist.org/v1/taxa"
    "?taxon_id=20978"       # Anura — frogs & toads
    "&rank=species"
    "&order=desc"
    "&order_by=observations_count"
    "&per_page=50"
    "&locale=ru"
)

# Difficulty heuristic by genus
EASY_GENERA = {"Rana", "Bufo", "Ceratophrys", "Bombina", "Xenopus", "Lithobates", "Pelophylax"}
HARD_GENERA = {"Dendrobates", "Oophaga", "Ranitomeya", "Phyllobates", "Mantella", "Phyllomedusa"}


def _request(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "frog-market-seeder/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def fetch_taxa() -> list[dict]:
    print("Fetching taxa from iNaturalist...")
    data = json.loads(_request(INATURALIST_URL))
    results = data.get("results", [])
    print(f"Got {len(results)} taxa\n")
    return results


def download_photo(url: str) -> bytes | None:
    try:
        return _request(url)
    except Exception as e:
        print(f"    ⚠ photo download failed: {e}")
        return None


def guess_difficulty(latin_name: str) -> str:
    genus = latin_name.split()[0] if latin_name else ""
    if genus in HARD_GENERA:
        return "hard"
    if genus in EASY_GENERA:
        return "easy"
    return "medium"


async def seed() -> None:
    taxa = fetch_taxa()

    ensure_bucket()

    async with AsyncSessionLocal() as session:
        added = skipped = 0

        for taxon in taxa:
            latin_name = (taxon.get("name") or "").strip()
            if not latin_name:
                continue

            existing = (await session.execute(
                select(Species).where(Species.latin_name == latin_name)
            )).scalar_one_or_none()

            if existing:
                print(f"  — skip (exists): {latin_name}")
                skipped += 1
                continue

            name = taxon.get("preferred_common_name") or latin_name

            description: str | None = taxon.get("wikipedia_summary") or None
            if description and len(description) > 2000:
                description = description[:2000].rsplit(" ", 1)[0] + "…"

            difficulty = guess_difficulty(latin_name)

            photo_url: str | None = None
            default_photo = taxon.get("default_photo") or {}
            img_src = default_photo.get("medium_url")
            if img_src:
                print(f"  ↓ {latin_name}  [{difficulty}]")
                img_bytes = download_photo(img_src)
                if img_bytes:
                    key = upload_file(img_bytes, "image/jpeg", folder="species")
                    photo_url = public_url(key)
                time.sleep(0.2)  # be polite to iNaturalist
            else:
                print(f"  + {latin_name}  [{difficulty}]  (no photo)")

            session.add(Species(
                name=name,
                latin_name=latin_name,
                description=description,
                difficulty=difficulty,
                photo_url=photo_url,
            ))
            added += 1

        await session.commit()

    await engine.dispose()
    print(f"\nDone: {added} added, {skipped} skipped.")


if __name__ == "__main__":
    asyncio.run(seed())
