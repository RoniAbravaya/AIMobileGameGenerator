"""
Batch Model

Represents a batch of games to be generated together.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import JSON, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.game import Game


class Batch(Base):
    """A batch of games generated together."""

    __tablename__ = "batches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", index=True
    )
    game_count: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    genre_mix: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    constraints: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    games: Mapped[List["Game"]] = relationship(
        "Game", back_populates="batch", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Batch {self.name} ({self.status})>"

    @property
    def completed_games(self) -> int:
        """Count of completed games in this batch."""
        return sum(1 for g in self.games if g.status == "completed")

    @property
    def progress_percentage(self) -> float:
        """Percentage of games completed."""
        if not self.games:
            return 0.0
        return (self.completed_games / len(self.games)) * 100
