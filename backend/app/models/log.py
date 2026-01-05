"""
Generation Log Model

Detailed logs for debugging and auditing.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class GenerationLog(Base):
    """Log entry for generation process."""

    __tablename__ = "generation_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    game_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("games.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    step_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    log_level: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    log_type: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    log_metadata: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    def __repr__(self) -> str:
        return f"<GenerationLog [{self.log_level}] {self.log_type}>"
