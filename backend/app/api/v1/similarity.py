"""
Similarity API Endpoints

View similarity checks and regeneration history.
"""

from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.similarity import RegenerationLog, SimilarityCheck
from app.services.similarity_service import SIMILARITY_THRESHOLD, MAX_REGENERATION_ATTEMPTS

router = APIRouter()


class SimilarityCheckResponse(BaseModel):
    """Response for similarity check."""

    id: UUID
    game_id: UUID
    is_similar: bool
    similarity_score: float
    most_similar_game_id: Optional[UUID] = None
    breakdown: Optional[Dict] = None
    attempt_number: int
    triggered_regeneration: bool
    created_at: str

    class Config:
        from_attributes = True


class RegenerationLogResponse(BaseModel):
    """Response for regeneration log."""

    id: UUID
    game_id: UUID
    batch_id: Optional[UUID] = None
    attempt_number: int
    reason: str
    similarity_score: float
    similar_to_game_id: Optional[UUID] = None
    constraints_applied: Optional[Dict] = None
    success: bool
    final_similarity_score: Optional[float] = None
    created_at: str

    class Config:
        from_attributes = True


class SimilarityConfigResponse(BaseModel):
    """Current similarity configuration."""

    threshold: float
    max_regeneration_attempts: int


@router.get(
    "/config",
    response_model=SimilarityConfigResponse,
    summary="Get similarity configuration",
)
async def get_similarity_config() -> SimilarityConfigResponse:
    """Get current similarity check configuration."""
    return SimilarityConfigResponse(
        threshold=SIMILARITY_THRESHOLD,
        max_regeneration_attempts=MAX_REGENERATION_ATTEMPTS,
    )


@router.get(
    "/checks/{game_id}",
    response_model=List[SimilarityCheckResponse],
    summary="Get similarity checks for a game",
)
async def get_similarity_checks(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> List[SimilarityCheckResponse]:
    """Get all similarity checks performed for a game."""
    result = await db.execute(
        select(SimilarityCheck)
        .where(SimilarityCheck.game_id == game_id)
        .order_by(SimilarityCheck.attempt_number)
    )
    checks = result.scalars().all()
    return [
        SimilarityCheckResponse(
            id=c.id,
            game_id=c.game_id,
            is_similar=c.is_similar,
            similarity_score=c.similarity_score,
            most_similar_game_id=c.most_similar_game_id,
            breakdown=c.breakdown,
            attempt_number=c.attempt_number,
            triggered_regeneration=c.triggered_regeneration,
            created_at=c.created_at.isoformat(),
        )
        for c in checks
    ]


@router.get(
    "/regenerations/{game_id}",
    response_model=List[RegenerationLogResponse],
    summary="Get regeneration history for a game",
)
async def get_regeneration_logs(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> List[RegenerationLogResponse]:
    """Get all regeneration attempts for a game."""
    result = await db.execute(
        select(RegenerationLog)
        .where(RegenerationLog.game_id == game_id)
        .order_by(RegenerationLog.attempt_number)
    )
    logs = result.scalars().all()
    return [
        RegenerationLogResponse(
            id=log.id,
            game_id=log.game_id,
            batch_id=log.batch_id,
            attempt_number=log.attempt_number,
            reason=log.reason,
            similarity_score=log.similarity_score,
            similar_to_game_id=log.similar_to_game_id,
            constraints_applied=log.constraints_applied,
            success=log.success,
            final_similarity_score=log.final_similarity_score,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]


@router.get(
    "/regenerations",
    response_model=List[RegenerationLogResponse],
    summary="Get all regeneration logs",
)
async def list_regeneration_logs(
    skip: int = 0,
    limit: int = 50,
    batch_id: UUID = None,
    db: AsyncSession = Depends(get_db),
) -> List[RegenerationLogResponse]:
    """List all regeneration attempts with optional filtering."""
    query = (
        select(RegenerationLog)
        .offset(skip)
        .limit(limit)
        .order_by(RegenerationLog.created_at.desc())
    )

    if batch_id:
        query = query.where(RegenerationLog.batch_id == batch_id)

    result = await db.execute(query)
    logs = result.scalars().all()
    return [
        RegenerationLogResponse(
            id=log.id,
            game_id=log.game_id,
            batch_id=log.batch_id,
            attempt_number=log.attempt_number,
            reason=log.reason,
            similarity_score=log.similarity_score,
            similar_to_game_id=log.similar_to_game_id,
            constraints_applied=log.constraints_applied,
            success=log.success,
            final_similarity_score=log.final_similarity_score,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]


@router.get(
    "/stats",
    summary="Get similarity check statistics",
)
async def get_similarity_stats(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get aggregate statistics about similarity checks."""
    from sqlalchemy import func

    # Total checks
    total_result = await db.execute(select(func.count(SimilarityCheck.id)))
    total_checks = total_result.scalar() or 0

    # Checks that triggered regeneration
    regen_result = await db.execute(
        select(func.count(SimilarityCheck.id))
        .where(SimilarityCheck.triggered_regeneration == True)
    )
    triggered_regenerations = regen_result.scalar() or 0

    # Average similarity score
    avg_result = await db.execute(
        select(func.avg(SimilarityCheck.similarity_score))
    )
    avg_similarity = avg_result.scalar() or 0

    # Total regeneration attempts
    regen_attempts_result = await db.execute(
        select(func.count(RegenerationLog.id))
    )
    total_regenerations = regen_attempts_result.scalar() or 0

    return {
        "total_similarity_checks": total_checks,
        "checks_triggering_regeneration": triggered_regenerations,
        "regeneration_rate": (
            triggered_regenerations / total_checks if total_checks > 0 else 0
        ),
        "average_similarity_score": float(avg_similarity),
        "total_regeneration_attempts": total_regenerations,
        "threshold": SIMILARITY_THRESHOLD,
    }
