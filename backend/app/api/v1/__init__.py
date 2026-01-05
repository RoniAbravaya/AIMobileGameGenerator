"""API v1 routes."""

from fastapi import APIRouter

from app.api.v1 import batches, events, games, mechanics, metrics

api_router = APIRouter()

api_router.include_router(batches.router, prefix="/batches", tags=["batches"])
api_router.include_router(games.router, prefix="/games", tags=["games"])
api_router.include_router(mechanics.router, prefix="/mechanics", tags=["mechanics"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
