"""
Batch Schemas

Pydantic models for batch API operations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class BatchCreate(BaseModel):
    """Schema for creating a new batch."""

    name: Optional[str] = Field(None, description="Batch name (auto-generated if not provided)")
    game_count: int = Field(default=10, ge=1, le=50, description="Number of games to generate")
    genre_mix: List[str] = Field(
        default=["platformer", "runner", "puzzle"],
        description="List of genres to include",
    )
    constraints: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional constraints from learning loop",
    )


class BatchStatus(BaseModel):
    """Schema for batch status."""

    id: UUID
    name: str
    status: str
    game_count: int
    completed_games: int
    progress_percentage: float
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatchResponse(BaseModel):
    """Full batch response with games."""

    id: UUID
    name: str
    status: str
    game_count: int
    genre_mix: List[str]
    constraints: Optional[Dict[str, Any]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    games: List["GameSummary"] = []

    class Config:
        from_attributes = True


# Forward reference for circular import
from app.schemas.game import GameSummary

BatchResponse.model_rebuild()
