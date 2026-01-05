"""
Game Asset Model

AI-generated assets for each game.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.game import Game


class GameAsset(Base):
    """An AI-generated asset for a game."""

    __tablename__ = "game_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )

    asset_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    local_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    ai_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    format: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    asset_metadata: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship
    game: Mapped["Game"] = relationship("Game", back_populates="assets")

    def __repr__(self) -> str:
        return f"<GameAsset {self.asset_type}: {self.filename}>"

    @property
    def is_image(self) -> bool:
        """Check if asset is an image."""
        return self.asset_type in ["sprite", "background", "ui_element", "particle", "icon", "splash"]

    @property
    def is_audio(self) -> bool:
        """Check if asset is audio."""
        return self.asset_type in ["sound_effect", "music"]
