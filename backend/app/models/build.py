"""
Game Build Model

Build tracking for GitHub Actions.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.game import Game


class GameBuild(Base):
    """A build of a game via GitHub Actions."""

    __tablename__ = "game_builds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )

    build_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", index=True
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False, default="android")
    build_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="debug"
    )

    artifact_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    logs_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    github_run_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    github_workflow: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    version_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    version_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship
    game: Mapped["Game"] = relationship("Game", back_populates="builds")

    def __repr__(self) -> str:
        return f"<GameBuild #{self.build_number} ({self.status})>"

    @property
    def duration_seconds(self) -> Optional[float]:
        """Duration of build in seconds."""
        if not self.started_at or not self.completed_at:
            return None
        delta = self.completed_at - self.started_at
        return delta.total_seconds()

    @property
    def is_successful(self) -> bool:
        """Check if build was successful."""
        return self.status == "success"
