"""
Game Step Model

Tracks the execution of each workflow step for a game.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.game import Game


class GameStep(Base):
    """Detailed tracking of each workflow step execution."""

    __tablename__ = "game_steps"
    __table_args__ = (UniqueConstraint("game_id", "step_number", name="unique_game_step"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )

    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", index=True
    )

    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Step artifacts and validation
    artifacts: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    validation_results: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    logs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    game: Mapped["Game"] = relationship("Game", back_populates="steps")

    def __repr__(self) -> str:
        return f"<GameStep {self.step_number}: {self.step_name} ({self.status})>"

    @property
    def duration_seconds(self) -> Optional[float]:
        """Duration of step execution in seconds."""
        if not self.started_at or not self.completed_at:
            return None
        delta = self.completed_at - self.started_at
        return delta.total_seconds()

    @property
    def can_retry(self) -> bool:
        """Check if step can be retried."""
        return self.status == "failed" and self.retry_count < self.max_retries
