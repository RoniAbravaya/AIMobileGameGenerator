"""
Game API Endpoints

Handles individual game operations.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.game import GameCreate, GameResponse, GameStatus, GameSummary
from app.schemas.step import StepResponse, StepRetryRequest
from app.services.game_service import GameService

router = APIRouter()


@router.get(
    "",
    response_model=List[GameSummary],
    summary="List all games",
)
async def list_games(
    skip: int = 0,
    limit: int = 50,
    status_filter: str = Query(None, alias="status"),
    genre: str = None,
    batch_id: UUID = None,
    db: AsyncSession = Depends(get_db),
) -> List[GameSummary]:
    """
    List all games with optional filtering.

    - **status**: Filter by game status
    - **genre**: Filter by genre
    - **batch_id**: Filter by batch
    """
    service = GameService(db)
    games = await service.list_games(
        skip=skip,
        limit=limit,
        status=status_filter,
        genre=genre,
        batch_id=batch_id,
    )
    return [GameSummary.model_validate(g) for g in games]


@router.post(
    "",
    response_model=GameStatus,
    status_code=status.HTTP_201_CREATED,
    summary="Create a single game",
)
async def create_game(
    game_data: GameCreate,
    db: AsyncSession = Depends(get_db),
) -> GameStatus:
    """Create a single game outside of a batch."""
    service = GameService(db)
    game = await service.create_game(game_data)
    return GameStatus.model_validate(game)


@router.get(
    "/{game_id}",
    response_model=GameResponse,
    summary="Get game details",
)
async def get_game(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> GameResponse:
    """Get detailed game information including all steps."""
    service = GameService(db)
    game = await service.get_game(game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game {game_id} not found",
        )
    return GameResponse.model_validate(game)


@router.get(
    "/{game_id}/status",
    response_model=GameStatus,
    summary="Get game status",
)
async def get_game_status(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> GameStatus:
    """Get current game status and step progress."""
    service = GameService(db)
    game = await service.get_game(game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game {game_id} not found",
        )
    return GameStatus.model_validate(game)


@router.get(
    "/{game_id}/steps",
    response_model=List[StepResponse],
    summary="Get game steps",
)
async def get_game_steps(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> List[StepResponse]:
    """Get all workflow steps for a game."""
    service = GameService(db)
    steps = await service.get_game_steps(game_id)
    return [StepResponse.model_validate(s) for s in steps]


@router.get(
    "/{game_id}/steps/{step_number}",
    response_model=StepResponse,
    summary="Get specific step",
)
async def get_game_step(
    game_id: UUID,
    step_number: int,
    db: AsyncSession = Depends(get_db),
) -> StepResponse:
    """Get details of a specific workflow step."""
    service = GameService(db)
    step = await service.get_step(game_id, step_number)
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Step {step_number} for game {game_id} not found",
        )
    return StepResponse.model_validate(step)


@router.post(
    "/{game_id}/steps/{step_number}/retry",
    response_model=StepResponse,
    summary="Retry failed step",
)
async def retry_step(
    game_id: UUID,
    step_number: int,
    retry_data: StepRetryRequest = None,
    db: AsyncSession = Depends(get_db),
) -> StepResponse:
    """Retry a failed workflow step."""
    service = GameService(db)
    step = await service.retry_step(
        game_id,
        step_number,
        force=retry_data.force if retry_data else False,
    )
    if not step:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot retry step {step_number}",
        )
    return StepResponse.model_validate(step)


@router.post(
    "/{game_id}/cancel",
    response_model=GameStatus,
    summary="Cancel game generation",
)
async def cancel_game(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> GameStatus:
    """Cancel game generation."""
    service = GameService(db)
    game = await service.cancel_game(game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game {game_id} not found",
        )
    return GameStatus.model_validate(game)
