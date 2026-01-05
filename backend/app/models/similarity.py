"""
Similarity Check Model

Tracks similarity checks and regeneration attempts for games.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SimilarityCheck(Base):
    """Record of similarity checks performed on a game."""

    __tablename__ = "similarity_checks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )

    # Check results
    is_similar: Mapped[bool] = mapped_column(Boolean, nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    most_similar_game_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # Breakdown of similarity components
    breakdown: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)

    # Regeneration tracking
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    triggered_regeneration: Mapped[bool] = mapped_column(Boolean, default=False)

    # Previous GDD that was rejected (for analysis)
    rejected_gdd: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<SimilarityCheck game={self.game_id} score={self.similarity_score:.2f}>"


class RegenerationLog(Base):
    """Log of regeneration attempts due to similarity."""

    __tablename__ = "regeneration_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True
    )

    # Regeneration details
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    similar_to_game_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # What was changed for the new attempt
    constraints_applied: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)

    # Outcome
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    final_similarity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<RegenerationLog game={self.game_id} attempt={self.attempt_number}>"
