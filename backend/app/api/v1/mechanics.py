"""
Mechanics API Endpoints

Manages the Flame mechanics library.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.mechanic import MechanicCreate, MechanicResponse
from app.services.mechanic_service import MechanicService

router = APIRouter()


@router.get(
    "",
    response_model=List[MechanicResponse],
    summary="List all mechanics",
)
async def list_mechanics(
    skip: int = 0,
    limit: int = 100,
    genre: str = Query(None, description="Filter by genre tag"),
    input_model: str = Query(None, description="Filter by input model"),
    complexity_max: int = Query(None, ge=1, le=5, description="Max complexity"),
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
) -> List[MechanicResponse]:
    """
    List mechanics from the library.

    - **genre**: Filter by genre tag
    - **input_model**: Filter by input type (tap, drag, etc.)
    - **complexity_max**: Maximum complexity rating
    - **active_only**: Only show active mechanics
    """
    service = MechanicService(db)
    mechanics = await service.list_mechanics(
        skip=skip,
        limit=limit,
        genre=genre,
        input_model=input_model,
        complexity_max=complexity_max,
        active_only=active_only,
    )
    return [MechanicResponse.model_validate(m) for m in mechanics]


@router.post(
    "",
    response_model=MechanicResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a mechanic",
)
async def create_mechanic(
    mechanic_data: MechanicCreate,
    db: AsyncSession = Depends(get_db),
) -> MechanicResponse:
    """Add a new mechanic to the library."""
    service = MechanicService(db)
    mechanic = await service.create_mechanic(mechanic_data)
    return MechanicResponse.model_validate(mechanic)


@router.get(
    "/{mechanic_id}",
    response_model=MechanicResponse,
    summary="Get mechanic details",
)
async def get_mechanic(
    mechanic_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> MechanicResponse:
    """Get mechanic details."""
    service = MechanicService(db)
    mechanic = await service.get_mechanic(mechanic_id)
    if not mechanic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mechanic {mechanic_id} not found",
        )
    return MechanicResponse.model_validate(mechanic)


@router.put(
    "/{mechanic_id}",
    response_model=MechanicResponse,
    summary="Update mechanic",
)
async def update_mechanic(
    mechanic_id: UUID,
    mechanic_data: MechanicCreate,
    db: AsyncSession = Depends(get_db),
) -> MechanicResponse:
    """Update a mechanic."""
    service = MechanicService(db)
    mechanic = await service.update_mechanic(mechanic_id, mechanic_data)
    if not mechanic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mechanic {mechanic_id} not found",
        )
    return MechanicResponse.model_validate(mechanic)


@router.delete(
    "/{mechanic_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate mechanic",
)
async def deactivate_mechanic(
    mechanic_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Deactivate a mechanic (soft delete)."""
    service = MechanicService(db)
    success = await service.deactivate_mechanic(mechanic_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mechanic {mechanic_id} not found",
        )


@router.get(
    "/genres",
    response_model=List[str],
    summary="List available genres",
)
async def list_genres(
    db: AsyncSession = Depends(get_db),
) -> List[str]:
    """Get list of all genre tags in the library."""
    service = MechanicService(db)
    return await service.get_all_genres()


@router.get(
    "/recommend",
    response_model=List[MechanicResponse],
    summary="Get recommended mechanics",
)
async def recommend_mechanics(
    genre: str,
    count: int = Query(3, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
) -> List[MechanicResponse]:
    """
    Get recommended mechanics for a genre based on learning weights.

    Uses performance data to recommend the best mechanics.
    """
    service = MechanicService(db)
    mechanics = await service.recommend_mechanics(genre, count)
    return [MechanicResponse.model_validate(m) for m in mechanics]
