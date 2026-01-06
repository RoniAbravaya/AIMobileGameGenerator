"""
Logs API Endpoints

Provides access to generation logs for monitoring game creation progress.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.log import GenerationLog
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class LogEntry(BaseModel):
    """Log entry response schema."""
    id: UUID
    batch_id: Optional[UUID] = None
    game_id: Optional[UUID] = None
    step_number: Optional[int] = None
    log_level: str
    log_type: str
    message: str
    metadata: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get(
    "/games/{game_id}",
    response_model=List[LogEntry],
    summary="Get logs for a game",
)
async def get_game_logs(
    game_id: UUID,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    level: Optional[str] = Query(default=None, description="Filter by log level"),
    db: AsyncSession = Depends(get_db),
) -> List[LogEntry]:
    """Get generation logs for a specific game."""
    query = (
        select(GenerationLog)
        .where(GenerationLog.game_id == game_id)
        .order_by(desc(GenerationLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    
    if level:
        query = query.where(GenerationLog.log_level == level)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        LogEntry(
            id=log.id,
            batch_id=log.batch_id,
            game_id=log.game_id,
            step_number=log.step_number,
            log_level=log.log_level,
            log_type=log.log_type,
            message=log.message,
            metadata=log.log_metadata,
            created_at=log.created_at,
        )
        for log in reversed(logs)  # Reverse to show oldest first
    ]


@router.get(
    "/batches/{batch_id}",
    response_model=List[LogEntry],
    summary="Get logs for a batch",
)
async def get_batch_logs(
    batch_id: UUID,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[LogEntry]:
    """Get generation logs for a specific batch."""
    query = (
        select(GenerationLog)
        .where(GenerationLog.batch_id == batch_id)
        .order_by(desc(GenerationLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        LogEntry(
            id=log.id,
            batch_id=log.batch_id,
            game_id=log.game_id,
            step_number=log.step_number,
            log_level=log.log_level,
            log_type=log.log_type,
            message=log.message,
            metadata=log.log_metadata,
            created_at=log.created_at,
        )
        for log in reversed(logs)
    ]
