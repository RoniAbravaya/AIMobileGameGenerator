"""
Game Model

Represents an individual game with full lifecycle tracking.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.asset import GameAsset
    from app.models.batch import Batch
    from app.models.build import GameBuild
    from app.models.step import GameStep


class Game(Base):
    """An individual game in the generation pipeline."""

    __tablename__ = "games"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), nullable=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    genre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="created", index=True
    )
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # GitHub
    github_repo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    github_repo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Specifications (JSON)
    gdd_spec: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    analytics_spec: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    selected_mechanics: Mapped[list] = mapped_column(JSON, nullable=True, default=list)
    selected_template: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    batch: Mapped[Optional["Batch"]] = relationship("Batch", back_populates="games")
    steps: Mapped[List["GameStep"]] = relationship(
        "GameStep", back_populates="game", cascade="all, delete-orphan"
    )
    assets: Mapped[List["GameAsset"]] = relationship(
        "GameAsset", back_populates="game", cascade="all, delete-orphan"
    )
    builds: Mapped[List["GameBuild"]] = relationship(
        "GameBuild", back_populates="game", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Game {self.name} ({self.status}, step {self.current_step})>"

    @property
    def is_complete(self) -> bool:
        """Check if game has completed all steps."""
        return self.current_step >= 12

    @property
    def step_progress(self) -> float:
        """Progress as percentage through steps."""
        return (self.current_step / 12) * 100

    @property
    def latest_build(self) -> Optional["GameBuild"]:
        """Get the most recent build."""
        if not self.builds:
            return None
        return max(self.builds, key=lambda b: b.created_at)
