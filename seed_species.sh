#!/usr/bin/env bash
set -e

# Check that backend container is running
if ! docker compose ps --status running backend | grep -q frog-backend; then
  echo "Error: backend container is not running. Run 'docker compose up -d' first."
  exit 1
fi

echo "Seeding species from iNaturalist..."
docker compose exec backend python scripts/seed_species.py
