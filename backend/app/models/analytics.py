"""
Analytics Models

Event tracking and aggregated metrics for games.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.game import Game


class AnalyticsEvent(Base):
    """Raw analytics event from a game."""

    __tablename__ = "analytics_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )

    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    properties: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    device_info: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<AnalyticsEvent {self.event_type} @ {self.timestamp}>"


class GameMetrics(Base):
    """Aggregated daily metrics per game."""

    __tablename__ = "game_metrics"
    __table_args__ = (UniqueConstraint("game_id", "date", name="unique_game_date"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False
    )

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    installs: Mapped[int] = mapped_column(Integer, default=0)
    dau: Mapped[int] = mapped_column(Integer, default=0)
    sessions: Mapped[int] = mapped_column(Integer, default=0)
    avg_session_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)

    retention_d1: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=0)
    retention_d7: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=0)
    retention_d30: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=0)

    levels_completed: Mapped[int] = mapped_column(Integer, default=0)
    levels_failed: Mapped[int] = mapped_column(Integer, default=0)

    ad_impressions: Mapped[int] = mapped_column(Integer, default=0)
    ad_revenue_cents: Mapped[int] = mapped_column(Integer, default=0)
    iap_revenue_cents: Mapped[int] = mapped_column(Integer, default=0)

    score: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=0, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<GameMetrics {self.date} - DAU: {self.dau}>"

    @property
    def total_revenue_cents(self) -> int:
        """Total revenue from ads and IAP."""
        return self.ad_revenue_cents + self.iap_revenue_cents

    @property
    def completion_rate(self) -> float:
        """Level completion rate."""
        total = self.levels_completed + self.levels_failed
        if total == 0:
            return 0.0
        return self.levels_completed / total
