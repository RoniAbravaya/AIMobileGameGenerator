"""
Batch API Endpoints

Handles batch creation and management.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.batch import BatchCreate, BatchResponse, BatchStatus
from app.services.batch_service import BatchService

router = APIRouter()


@router.post(
    "",
    response_model=BatchStatus,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new batch",
    description="Creates a new batch of games to be generated. Triggers async processing.",
)
async def create_batch(
    batch_data: BatchCreate,
    db: AsyncSession = Depends(get_db),
) -> BatchStatus:
    """
    Create a new batch of games.

    - **game_count**: Number of games to generate (1-50, default 10)
    - **genre_mix**: List of genres to include
    - **constraints**: Optional constraints from learning loop
    """
    service = BatchService(db)
    batch = await service.create_batch(batch_data)
    return BatchStatus.model_validate(batch)


@router.get(
    "",
    response_model=List[BatchStatus],
    summary="List all batches",
)
async def list_batches(
    skip: int = 0,
    limit: int = 20,
    status_filter: str = None,
    db: AsyncSession = Depends(get_db),
) -> List[BatchStatus]:
    """List all batches with optional filtering."""
    service = BatchService(db)
    batches = await service.list_batches(skip=skip, limit=limit, status=status_filter)
    return [BatchStatus.model_validate(b) for b in batches]


@router.get(
    "/{batch_id}",
    response_model=BatchResponse,
    summary="Get batch details",
)
async def get_batch(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BatchResponse:
    """Get detailed batch information including all games."""
    service = BatchService(db)
    batch = await service.get_batch(batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )
    return BatchResponse.model_validate(batch)


@router.post(
    "/{batch_id}/start",
    response_model=BatchStatus,
    summary="Start batch processing",
)
async def start_batch(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BatchStatus:
    """Start processing a pending batch."""
    service = BatchService(db)
    batch = await service.start_batch(batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )
    return BatchStatus.model_validate(batch)


@router.post(
    "/{batch_id}/cancel",
    response_model=BatchStatus,
    summary="Cancel batch processing",
)
async def cancel_batch(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BatchStatus:
    """Cancel a running batch."""
    service = BatchService(db)
    batch = await service.cancel_batch(batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )
    return BatchStatus.model_validate(batch)
