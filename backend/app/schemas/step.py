"""
Step Schemas

Pydantic models for workflow step operations.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel


class StepStatus(BaseModel):
    """Current step status."""

    step_number: int
    step_name: str
    status: str
    retry_count: int
    max_retries: int
    can_retry: bool
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class StepResponse(BaseModel):
    """Full step response with artifacts."""

    id: UUID
    game_id: UUID
    step_number: int
    step_name: str
    status: str
    retry_count: int
    max_retries: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    artifacts: Dict[str, Any] = {}
    validation_results: Dict[str, Any] = {}

    class Config:
        from_attributes = True


class StepRetryRequest(BaseModel):
    """Request to retry a failed step."""

    force: bool = False
