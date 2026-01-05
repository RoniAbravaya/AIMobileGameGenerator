"""
Batch Service

Handles batch creation and orchestration of game generation.
"""

import uuid
from datetime import datetime
from typing import List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.batch import Batch
from app.models.game import Game
from app.schemas.batch import BatchCreate

logger = structlog.get_logger()


class BatchService:
    """Service for batch operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_batch(self, data: BatchCreate) -> Batch:
        """
        Create a new batch with games.

        Creates the batch record and initializes game records for each
        game in the batch. Does not start processing.
        """
        # Generate name if not provided
        name = data.name or f"Batch-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"

        batch = Batch(
            name=name,
            status="pending",
            game_count=data.game_count,
            genre_mix=data.genre_mix,
            constraints=data.constraints or {},
        )

        self.db.add(batch)
        await self.db.flush()

        # Create games for the batch
        genres = data.genre_mix if data.genre_mix else ["platformer"]
        for i in range(data.game_count):
            genre = genres[i % len(genres)]
            game_name = f"{batch.name}-{genre}-{i + 1:02d}"
            slug = f"game-{batch.id.hex[:8]}-{i + 1:03d}"

            game = Game(
                batch_id=batch.id,
                name=game_name,
                slug=slug,
                genre=genre,
                status="created",
                current_step=0,
            )
            self.db.add(game)

        await self.db.commit()
        await self.db.refresh(batch)

        logger.info(
            "batch_created",
            batch_id=str(batch.id),
            name=batch.name,
            game_count=batch.game_count,
        )

        return batch

    async def get_batch(self, batch_id: uuid.UUID) -> Optional[Batch]:
        """Get batch with all games."""
        result = await self.db.execute(
            select(Batch)
            .options(selectinload(Batch.games))
            .where(Batch.id == batch_id)
        )
        return result.scalar_one_or_none()

    async def list_batches(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
    ) -> List[Batch]:
        """List batches with optional filtering."""
        query = select(Batch).offset(skip).limit(limit).order_by(Batch.created_at.desc())

        if status:
            query = query.where(Batch.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def start_batch(self, batch_id: uuid.UUID) -> Optional[Batch]:
        """
        Start batch processing.

        Transitions batch to 'running' and triggers async processing.
        """
        batch = await self.get_batch(batch_id)
        if not batch:
            return None

        if batch.status != "pending":
            logger.warning(
                "batch_start_invalid_status",
                batch_id=str(batch_id),
                current_status=batch.status,
            )
            return batch

        batch.status = "running"
        batch.started_at = datetime.utcnow()

        # Update all games to in_progress
        for game in batch.games:
            game.status = "in_progress"

        await self.db.commit()

        # Trigger async processing via Celery
        from app.workers.tasks import process_batch

        process_batch.delay(str(batch_id))

        logger.info("batch_started", batch_id=str(batch_id))

        return batch

    async def cancel_batch(self, batch_id: uuid.UUID) -> Optional[Batch]:
        """Cancel a running batch."""
        batch = await self.get_batch(batch_id)
        if not batch:
            return None

        if batch.status not in ("pending", "running"):
            logger.warning(
                "batch_cancel_invalid_status",
                batch_id=str(batch_id),
                current_status=batch.status,
            )
            return batch

        batch.status = "cancelled"

        # Cancel all non-completed games
        for game in batch.games:
            if game.status not in ("completed", "published"):
                game.status = "cancelled"

        await self.db.commit()

        logger.info("batch_cancelled", batch_id=str(batch_id))

        return batch

    async def complete_batch(self, batch_id: uuid.UUID) -> Optional[Batch]:
        """Mark batch as completed."""
        batch = await self.get_batch(batch_id)
        if not batch:
            return None

        batch.status = "completed"
        batch.completed_at = datetime.utcnow()

        await self.db.commit()

        logger.info(
            "batch_completed",
            batch_id=str(batch_id),
            completed_games=batch.completed_games,
        )

        return batch
