"""
Game Schemas

Pydantic models for game API operations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class GameCreate(BaseModel):
    """Schema for creating a single game (outside of batch)."""

    name: str = Field(..., min_length=1, max_length=255)
    genre: str = Field(..., min_length=1, max_length=100)
    constraints: Optional[Dict[str, Any]] = None


class GameSummary(BaseModel):
    """Brief game summary for listings."""

    id: UUID
    name: str
    slug: str
    genre: str
    status: str
    current_step: int
    step_progress: float
    github_repo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GameStatus(BaseModel):
    """Current game status with step details."""

    id: UUID
    name: str
    slug: str
    genre: str
    status: str
    current_step: int
    step_progress: float
    github_repo: Optional[str] = None
    github_repo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    steps: List["StepSummary"] = []

    class Config:
        from_attributes = True


class StepSummary(BaseModel):
    """Brief step information."""

    step_number: int
    step_name: str
    status: str
    retry_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class GameResponse(BaseModel):
    """Full game response with all details."""

    id: UUID
    batch_id: Optional[UUID] = None
    name: str
    slug: str
    genre: str
    status: str
    current_step: int
    step_progress: float
    github_repo: Optional[str] = None
    github_repo_url: Optional[str] = None
    gdd_spec: Dict[str, Any] = {}
    analytics_spec: Dict[str, Any] = {}
    selected_mechanics: List[str] = []
    selected_template: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    steps: List["StepResponse"] = []

    class Config:
        from_attributes = True


# Forward reference
from app.schemas.step import StepResponse

GameStatus.model_rebuild()
GameResponse.model_rebuild()
