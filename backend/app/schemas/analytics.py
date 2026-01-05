"""
Analytics Schemas

Pydantic models for analytics event ingestion and metrics.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AnalyticsEventCreate(BaseModel):
    """Schema for incoming analytics event."""

    game_id: UUID
    event_type: str = Field(
        ...,
        description="Event type from: game_start, level_start, level_complete, level_fail, "
        "unlock_prompt_shown, rewarded_ad_started, rewarded_ad_completed, "
        "rewarded_ad_failed, level_unlocked",
    )
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    level: Optional[int] = None
    properties: Optional[Dict[str, Any]] = None
    device_info: Optional[Dict[str, Any]] = None
    timestamp: datetime


class AnalyticsEventResponse(BaseModel):
    """Response for analytics event."""

    id: UUID
    game_id: UUID
    event_type: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    level: Optional[int] = None
    timestamp: datetime
    received_at: datetime

    class Config:
        from_attributes = True


class GameMetricsResponse(BaseModel):
    """Aggregated metrics for a game."""

    id: UUID
    game_id: UUID
    date: date
    installs: int
    dau: int
    sessions: int
    avg_session_duration_seconds: int
    retention_d1: Decimal
    retention_d7: Decimal
    retention_d30: Decimal
    levels_completed: int
    levels_failed: int
    ad_impressions: int
    ad_revenue_cents: int
    iap_revenue_cents: int
    total_revenue_cents: int
    completion_rate: float
    score: Decimal

    class Config:
        from_attributes = True


class MetricsSummary(BaseModel):
    """Summary metrics across all games."""

    total_games: int
    total_installs: int
    total_dau: int
    avg_retention_d1: float
    avg_retention_d7: float
    total_ad_revenue_cents: int
    total_iap_revenue_cents: int
    top_games: List["GameMetricsSummary"]


class GameMetricsSummary(BaseModel):
    """Brief metrics summary for a game."""

    game_id: UUID
    game_name: str
    installs: int
    dau: int
    retention_d7: float
    score: float

    class Config:
        from_attributes = True
