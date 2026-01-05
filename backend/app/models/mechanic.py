"""
Mechanic Model

Library of game mechanics from Flame examples.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Mechanic(Base):
    """A game mechanic from the Flame examples library."""

    __tablename__ = "mechanics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    flame_example: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    genre_tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    input_model: Mapped[str] = mapped_column(String(100), nullable=False)
    complexity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    code_snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    compatible_with_ads: Mapped[bool] = mapped_column(Boolean, default=True)
    compatible_with_levels: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Mechanic {self.name} ({self.input_model})>"

    @property
    def is_simple(self) -> bool:
        """Check if mechanic is simple (complexity 1-2)."""
        return self.complexity <= 2

    @property
    def is_complex(self) -> bool:
        """Check if mechanic is complex (complexity 4-5)."""
        return self.complexity >= 4
