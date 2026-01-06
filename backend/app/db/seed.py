"""
Database Seeding

Seeds the database with initial mechanics library data.
"""

import asyncio
import json
from pathlib import Path

import structlog

logger = structlog.get_logger()


async def seed_mechanics():
    """Seed the mechanics library from JSON file."""
    from app.db.session import async_session
    from app.models.mechanic import Mechanic
    from sqlalchemy import select

    # Load mechanics from JSON
    # Try multiple paths for flexibility (Docker vs local dev)
    possible_paths = [
        Path("/app/mechanics_library/mechanics.json"),  # Absolute path in Docker
        Path(__file__).parent.parent.parent / "mechanics_library" / "mechanics.json",  # Relative from app
        Path(__file__).parent.parent.parent.parent / "mechanics_library" / "mechanics.json",  # Local dev
    ]
    
    mechanics_file = None
    for path in possible_paths:
        logger.debug("checking_mechanics_path", path=str(path), exists=path.exists())
        if path.exists():
            mechanics_file = path
            logger.info("mechanics_file_found", path=str(path))
            break
    
    if not mechanics_file:
        logger.warning("mechanics_file_not_found", checked_paths=[str(p) for p in possible_paths])
        return

    with open(mechanics_file) as f:
        data = json.load(f)

    async with async_session() as db:
        for mech_data in data.get("mechanics", []):
            # Check if mechanic already exists
            result = await db.execute(
                select(Mechanic).where(Mechanic.name == mech_data["name"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                logger.info("mechanic_exists_skipping", name=mech_data["name"])
                continue

            mechanic = Mechanic(
                name=mech_data["name"],
                source_url=mech_data["source_url"],
                flame_example=mech_data.get("flame_example"),
                genre_tags=mech_data.get("genre_tags", []),
                input_model=mech_data["input_model"],
                complexity=mech_data.get("complexity", 1),
                description=mech_data.get("description"),
                compatible_with_ads=mech_data.get("compatible_with_ads", True),
                compatible_with_levels=mech_data.get("compatible_with_levels", True),
            )

            db.add(mechanic)
            logger.info("mechanic_added", name=mech_data["name"])

        await db.commit()
        logger.info("mechanics_seeding_complete")


async def seed_all():
    """Run all seed functions."""
    await seed_mechanics()


if __name__ == "__main__":
    asyncio.run(seed_all())
