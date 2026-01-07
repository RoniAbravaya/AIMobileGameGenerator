"""
Game Service

Handles individual game operations and workflow progression.
"""

import re
import uuid
from datetime import datetime
from typing import List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.state_machine import STEP_DEFINITIONS
from app.models.game import Game
from app.models.step import GameStep
from app.schemas.game import GameCreate

logger = structlog.get_logger()


class GameService:
    """Service for game operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_slug(self, name: str) -> str:
        """Generate URL-friendly slug from name."""
        slug = name.lower()
        slug = re.sub(r"[^a-z0-9]+", "-", slug)
        slug = slug.strip("-")
        return f"{slug}-{uuid.uuid4().hex[:8]}"

    async def create_game(self, data: GameCreate) -> Game:
        """Create a single game outside of a batch."""
        game = Game(
            name=data.name,
            slug=self._generate_slug(data.name),
            genre=data.genre,
            status="created",
            current_step=0,
        )

        self.db.add(game)
        await self.db.commit()
        await self.db.refresh(game)

        # Initialize step records
        await self._initialize_steps(game.id)

        logger.info(
            "game_created",
            game_id=str(game.id),
            name=game.name,
            genre=game.genre,
        )

        return game

    async def _initialize_steps(self, game_id: uuid.UUID) -> None:
        """Initialize all step records for a game."""
        for step_num, step_def in STEP_DEFINITIONS.items():
            step = GameStep(
                game_id=game_id,
                step_number=step_num,
                step_name=step_def["name"].value,
                status="pending",
            )
            self.db.add(step)

        await self.db.commit()

    async def get_game(self, game_id: uuid.UUID) -> Optional[Game]:
        """Get game with all related data."""
        result = await self.db.execute(
            select(Game)
            .options(
                selectinload(Game.steps),
                selectinload(Game.assets),
                selectinload(Game.builds),
            )
            .where(Game.id == game_id)
        )
        return result.scalar_one_or_none()

    async def list_games(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        genre: Optional[str] = None,
        batch_id: Optional[uuid.UUID] = None,
    ) -> List[Game]:
        """List games with optional filtering."""
        query = select(Game).offset(skip).limit(limit).order_by(Game.created_at.desc())

        if status:
            query = query.where(Game.status == status)
        if genre:
            query = query.where(Game.genre == genre)
        if batch_id:
            query = query.where(Game.batch_id == batch_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_game_steps(self, game_id: uuid.UUID) -> List[GameStep]:
        """Get all steps for a game."""
        result = await self.db.execute(
            select(GameStep)
            .where(GameStep.game_id == game_id)
            .order_by(GameStep.step_number)
        )
        return list(result.scalars().all())

    async def get_step(self, game_id: uuid.UUID, step_number: int) -> Optional[GameStep]:
        """Get a specific step for a game."""
        result = await self.db.execute(
            select(GameStep)
            .where(GameStep.game_id == game_id)
            .where(GameStep.step_number == step_number)
        )
        return result.scalar_one_or_none()

    async def update_step_status(
        self,
        game_id: uuid.UUID,
        step_number: int,
        status: str,
        artifacts: dict = None,
        validation_results: dict = None,
        error_message: str = None,
        logs: str = None,
    ) -> Optional[GameStep]:
        """Update step status and optionally artifacts."""
        step = await self.get_step(game_id, step_number)
        if not step:
            return None

        step.status = status

        if status == "running":
            step.started_at = datetime.utcnow()
        elif status in ("completed", "failed"):
            step.completed_at = datetime.utcnow()

        if artifacts:
            step.artifacts = artifacts
        if validation_results:
            step.validation_results = validation_results
        if error_message:
            step.error_message = error_message
        if logs:
            step.logs = logs

        await self.db.commit()
        await self.db.refresh(step)

        # If step completed, update game's current_step
        if status == "completed":
            game = await self.get_game(game_id)
            if game and game.current_step < step_number:
                game.current_step = step_number
                game.updated_at = datetime.utcnow()

                # Check if all steps are complete
                if step_number >= 12:
                    game.status = "completed"

                await self.db.commit()

        return step

    async def retry_step(
        self,
        game_id: uuid.UUID,
        step_number: int,
        force: bool = False,
    ) -> Optional[GameStep]:
        """Retry a failed step."""
        step = await self.get_step(game_id, step_number)
        if not step:
            return None

        if not force and not step.can_retry:
            logger.warning(
                "step_retry_not_allowed",
                game_id=str(game_id),
                step_number=step_number,
                retry_count=step.retry_count,
                max_retries=step.max_retries,
            )
            return None

        # Reset step state
        step.status = "pending"
        step.retry_count += 1
        step.error_message = None
        step.started_at = None
        step.completed_at = None

        # Also update game status back to in_progress if it was failed
        game = await self.get_game(game_id)
        if game and game.status == "failed":
            game.status = "in_progress"
            game.updated_at = datetime.utcnow()
            logger.info(
                "game_status_reset_for_retry",
                game_id=str(game_id),
                from_status="failed",
                to_status="in_progress",
            )

        await self.db.commit()

        # Trigger step execution
        from app.workers.tasks import execute_step

        execute_step.delay(str(game_id), step_number)

        logger.info(
            "step_retry_triggered",
            game_id=str(game_id),
            step_number=step_number,
            retry_count=step.retry_count,
        )

        return step

    async def cancel_game(self, game_id: uuid.UUID) -> Optional[Game]:
        """Cancel game generation."""
        game = await self.get_game(game_id)
        if not game:
            return None

        if game.status in ("completed", "published"):
            logger.warning(
                "game_cancel_invalid_status",
                game_id=str(game_id),
                status=game.status,
            )
            return game

        game.status = "cancelled"
        game.updated_at = datetime.utcnow()

        await self.db.commit()

        logger.info("game_cancelled", game_id=str(game_id))

        return game

    async def update_gdd_spec(
        self,
        game_id: uuid.UUID,
        gdd_spec: dict,
    ) -> Optional[Game]:
        """Update game's GDD specification."""
        game = await self.get_game(game_id)
        if not game:
            return None

        game.gdd_spec = gdd_spec
        game.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(game)

        return game

    async def update_github_repo(
        self,
        game_id: uuid.UUID,
        repo_name: str,
        repo_url: str,
    ) -> Optional[Game]:
        """Update game's GitHub repository info."""
        game = await self.get_game(game_id)
        if not game:
            return None

        game.github_repo = repo_name
        game.github_repo_url = repo_url
        game.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(game)

        return game
