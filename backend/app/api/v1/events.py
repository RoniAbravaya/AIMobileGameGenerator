"""
Events API Endpoints

Receives analytics events from games.
"""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.analytics import AnalyticsEventCreate, AnalyticsEventResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.post(
    "",
    response_model=AnalyticsEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record analytics event",
    description="Receives analytics events from games. Called by games to report user actions.",
)
async def create_event(
    event_data: AnalyticsEventCreate,
    db: AsyncSession = Depends(get_db),
) -> AnalyticsEventResponse:
    """
    Record a single analytics event.

    Events must have one of these types:
    - game_start
    - level_start
    - level_complete
    - level_fail
    - unlock_prompt_shown
    - rewarded_ad_started
    - rewarded_ad_completed
    - rewarded_ad_failed
    - level_unlocked
    """
    service = AnalyticsService(db)
    event = await service.record_event(event_data)
    return AnalyticsEventResponse.model_validate(event)


@router.post(
    "/batch",
    response_model=List[AnalyticsEventResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Record multiple events",
)
async def create_events_batch(
    events: List[AnalyticsEventCreate],
    db: AsyncSession = Depends(get_db),
) -> List[AnalyticsEventResponse]:
    """Record multiple analytics events in a batch."""
    service = AnalyticsService(db)
    recorded = await service.record_events_batch(events)
    return [AnalyticsEventResponse.model_validate(e) for e in recorded]
