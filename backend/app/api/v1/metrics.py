"""
Metrics API Endpoints

Provides aggregated analytics and game performance metrics.
"""

from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.analytics import GameMetricsResponse, MetricsSummary
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get(
    "/summary",
    response_model=MetricsSummary,
    summary="Get metrics summary",
)
async def get_metrics_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to aggregate"),
    db: AsyncSession = Depends(get_db),
) -> MetricsSummary:
    """
    Get aggregated metrics summary across all games.

    Returns totals and top performing games.
    """
    service = AnalyticsService(db)
    return await service.get_metrics_summary(days)


@router.get(
    "/games/{game_id}",
    response_model=List[GameMetricsResponse],
    summary="Get game metrics",
)
async def get_game_metrics(
    game_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
) -> List[GameMetricsResponse]:
    """Get daily metrics for a specific game."""
    service = AnalyticsService(db)
    metrics = await service.get_game_metrics(
        game_id,
        start_date=start_date,
        end_date=end_date,
    )
    return [GameMetricsResponse.model_validate(m) for m in metrics]


@router.get(
    "/rankings",
    response_model=List[GameMetricsResponse],
    summary="Get game rankings",
)
async def get_game_rankings(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> List[GameMetricsResponse]:
    """
    Get game rankings based on score.

    Score is calculated from:
    - Retention (40%)
    - Install count (25%)
    - Ad revenue (20%)
    - Completion rate (15%)
    """
    service = AnalyticsService(db)
    return await service.get_rankings(days=days, limit=limit)


@router.post(
    "/aggregate",
    status_code=202,
    summary="Trigger metrics aggregation",
)
async def trigger_aggregation(
    target_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Trigger metrics aggregation for a specific date.

    This is typically run daily via a scheduled task.
    """
    service = AnalyticsService(db)
    await service.trigger_aggregation(target_date)
    return {"status": "accepted", "message": "Aggregation task queued"}
