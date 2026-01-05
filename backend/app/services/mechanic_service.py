"""
Mechanic Service

Manages the Flame mechanics library and provides recommendations.
"""

import uuid
from typing import List, Optional

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.learning import LearningWeight
from app.models.mechanic import Mechanic
from app.schemas.mechanic import MechanicCreate

logger = structlog.get_logger()


class MechanicService:
    """Service for mechanics library operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_mechanic(self, data: MechanicCreate) -> Mechanic:
        """Add a new mechanic to the library."""
        mechanic = Mechanic(
            name=data.name,
            source_url=data.source_url,
            flame_example=data.flame_example,
            genre_tags=data.genre_tags,
            input_model=data.input_model,
            complexity=data.complexity,
            description=data.description,
            code_snippet=data.code_snippet,
            compatible_with_ads=data.compatible_with_ads,
            compatible_with_levels=data.compatible_with_levels,
        )

        self.db.add(mechanic)
        await self.db.commit()
        await self.db.refresh(mechanic)

        logger.info(
            "mechanic_created",
            mechanic_id=str(mechanic.id),
            name=mechanic.name,
        )

        return mechanic

    async def get_mechanic(self, mechanic_id: uuid.UUID) -> Optional[Mechanic]:
        """Get mechanic by ID."""
        result = await self.db.execute(
            select(Mechanic).where(Mechanic.id == mechanic_id)
        )
        return result.scalar_one_or_none()

    async def get_mechanic_by_name(self, name: str) -> Optional[Mechanic]:
        """Get mechanic by name."""
        result = await self.db.execute(
            select(Mechanic).where(Mechanic.name == name)
        )
        return result.scalar_one_or_none()

    async def list_mechanics(
        self,
        skip: int = 0,
        limit: int = 100,
        genre: Optional[str] = None,
        input_model: Optional[str] = None,
        complexity_max: Optional[int] = None,
        active_only: bool = True,
    ) -> List[Mechanic]:
        """List mechanics with filtering."""
        query = select(Mechanic).offset(skip).limit(limit)

        if active_only:
            query = query.where(Mechanic.is_active == True)

        if genre:
            # Check if genre is in the JSON array
            query = query.where(Mechanic.genre_tags.contains([genre]))

        if input_model:
            query = query.where(Mechanic.input_model == input_model)

        if complexity_max:
            query = query.where(Mechanic.complexity <= complexity_max)

        query = query.order_by(Mechanic.complexity, Mechanic.name)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_mechanic(
        self,
        mechanic_id: uuid.UUID,
        data: MechanicCreate,
    ) -> Optional[Mechanic]:
        """Update a mechanic."""
        mechanic = await self.get_mechanic(mechanic_id)
        if not mechanic:
            return None

        mechanic.name = data.name
        mechanic.source_url = data.source_url
        mechanic.flame_example = data.flame_example
        mechanic.genre_tags = data.genre_tags
        mechanic.input_model = data.input_model
        mechanic.complexity = data.complexity
        mechanic.description = data.description
        mechanic.code_snippet = data.code_snippet
        mechanic.compatible_with_ads = data.compatible_with_ads
        mechanic.compatible_with_levels = data.compatible_with_levels

        await self.db.commit()
        await self.db.refresh(mechanic)

        return mechanic

    async def deactivate_mechanic(self, mechanic_id: uuid.UUID) -> bool:
        """Soft delete a mechanic."""
        mechanic = await self.get_mechanic(mechanic_id)
        if not mechanic:
            return False

        mechanic.is_active = False
        await self.db.commit()

        logger.info("mechanic_deactivated", mechanic_id=str(mechanic_id))

        return True

    async def get_all_genres(self) -> List[str]:
        """Get all unique genre tags."""
        result = await self.db.execute(
            select(Mechanic.genre_tags).where(Mechanic.is_active == True)
        )
        all_tags = result.scalars().all()

        # Flatten and deduplicate
        genres = set()
        for tags in all_tags:
            if tags:
                genres.update(tags)

        return sorted(list(genres))

    async def recommend_mechanics(
        self,
        genre: str,
        count: int = 3,
    ) -> List[Mechanic]:
        """
        Recommend mechanics for a genre based on learning weights.

        Uses performance data to rank mechanics.
        """
        # Get mechanics for genre with their weights
        query = (
            select(Mechanic, LearningWeight.weight)
            .outerjoin(
                LearningWeight,
                (LearningWeight.mechanic_id == Mechanic.id)
                & (LearningWeight.genre == genre),
            )
            .where(Mechanic.is_active == True)
            .where(Mechanic.genre_tags.contains([genre]))
            .where(Mechanic.compatible_with_levels == True)
            .order_by(
                # Prioritize by weight (higher is better), then by complexity (lower is better)
                LearningWeight.weight.desc().nullslast(),
                Mechanic.complexity,
            )
            .limit(count)
        )

        result = await self.db.execute(query)
        rows = result.all()

        return [row[0] for row in rows]

    async def get_mechanics_for_genre(
        self,
        genre: str,
        complexity_range: tuple = (1, 3),
    ) -> List[Mechanic]:
        """Get all mechanics suitable for a genre and complexity range."""
        query = (
            select(Mechanic)
            .where(Mechanic.is_active == True)
            .where(Mechanic.genre_tags.contains([genre]))
            .where(Mechanic.complexity >= complexity_range[0])
            .where(Mechanic.complexity <= complexity_range[1])
            .order_by(Mechanic.complexity)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())
