"""
Learning Weight Model

Weights for mechanic selection based on past performance.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.mechanic import Mechanic


class LearningWeight(Base):
    """Weight for mechanic selection based on past performance."""

    __tablename__ = "learning_weights"
    __table_args__ = (
        UniqueConstraint("mechanic_id", "genre", name="unique_mechanic_genre"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mechanic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mechanics.id", ondelete="CASCADE"), nullable=False
    )

    genre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=1.0)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    avg_retention_d7: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=0)
    avg_completion_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=0)
    avg_ad_opt_in_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=0)

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<LearningWeight {self.genre}: {self.weight}>"

    @property
    def has_sufficient_data(self) -> bool:
        """Check if we have enough samples to trust the weight."""
        return self.sample_count >= 5
