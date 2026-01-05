"""
Mechanic Schemas

Pydantic models for mechanics library operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class MechanicCreate(BaseModel):
    """Schema for adding a new mechanic."""

    name: str = Field(..., min_length=1, max_length=255)
    source_url: str = Field(..., description="URL to Flame example")
    flame_example: Optional[str] = None
    genre_tags: List[str] = Field(default_factory=list)
    input_model: str = Field(..., description="Input type: tap, drag, joystick, tilt, swipe, multi_touch")
    complexity: int = Field(default=1, ge=1, le=5)
    description: Optional[str] = None
    code_snippet: Optional[str] = None
    compatible_with_ads: bool = True
    compatible_with_levels: bool = True


class MechanicResponse(BaseModel):
    """Full mechanic response."""

    id: UUID
    name: str
    source_url: str
    flame_example: Optional[str] = None
    genre_tags: List[str]
    input_model: str
    complexity: int
    description: Optional[str] = None
    compatible_with_ads: bool
    compatible_with_levels: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MechanicSummary(BaseModel):
    """Brief mechanic summary."""

    id: UUID
    name: str
    genre_tags: List[str]
    input_model: str
    complexity: int

    class Config:
        from_attributes = True
