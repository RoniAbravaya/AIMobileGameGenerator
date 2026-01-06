"""
Logging Service

Provides structured logging to the database for game generation progress.
"""

import uuid
from datetime import datetime
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log import GenerationLog

logger = structlog.get_logger()


class LoggingService:
    """Service for writing generation logs to the database."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        log_type: str,
        message: str,
        level: str = "info",
        batch_id: Optional[uuid.UUID] = None,
        game_id: Optional[uuid.UUID] = None,
        step_number: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> GenerationLog:
        """
        Write a log entry to the database.
        
        Args:
            log_type: Category of log (e.g., 'step_start', 'ai_request', 'github_commit')
            message: Human-readable log message
            level: Log level (debug, info, warning, error)
            batch_id: Associated batch ID
            game_id: Associated game ID
            step_number: Current step number (1-12)
            metadata: Additional JSON metadata
        """
        log_entry = GenerationLog(
            batch_id=batch_id,
            game_id=game_id,
            step_number=step_number,
            log_level=level,
            log_type=log_type,
            message=message,
            log_metadata=metadata or {},
        )
        
        self.db.add(log_entry)
        await self.db.flush()
        
        # Also log to structlog for terminal output
        log_func = getattr(logger, level, logger.info)
        log_func(
            log_type,
            message=message,
            batch_id=str(batch_id) if batch_id else None,
            game_id=str(game_id) if game_id else None,
            step_number=step_number,
        )
        
        return log_entry

    async def info(
        self,
        log_type: str,
        message: str,
        **kwargs,
    ) -> GenerationLog:
        """Log at INFO level."""
        return await self.log(log_type, message, level="info", **kwargs)

    async def debug(
        self,
        log_type: str,
        message: str,
        **kwargs,
    ) -> GenerationLog:
        """Log at DEBUG level."""
        return await self.log(log_type, message, level="debug", **kwargs)

    async def warning(
        self,
        log_type: str,
        message: str,
        **kwargs,
    ) -> GenerationLog:
        """Log at WARNING level."""
        return await self.log(log_type, message, level="warning", **kwargs)

    async def error(
        self,
        log_type: str,
        message: str,
        **kwargs,
    ) -> GenerationLog:
        """Log at ERROR level."""
        return await self.log(log_type, message, level="error", **kwargs)

    async def step_start(
        self,
        game_id: uuid.UUID,
        step_number: int,
        step_name: str,
        batch_id: Optional[uuid.UUID] = None,
    ) -> GenerationLog:
        """Log the start of a step."""
        return await self.info(
            "step_start",
            f"Starting Step {step_number}: {step_name}",
            game_id=game_id,
            batch_id=batch_id,
            step_number=step_number,
        )

    async def step_complete(
        self,
        game_id: uuid.UUID,
        step_number: int,
        step_name: str,
        batch_id: Optional[uuid.UUID] = None,
        duration_seconds: Optional[float] = None,
    ) -> GenerationLog:
        """Log the completion of a step."""
        message = f"Completed Step {step_number}: {step_name}"
        if duration_seconds:
            message += f" ({duration_seconds:.1f}s)"
        return await self.info(
            "step_complete",
            message,
            game_id=game_id,
            batch_id=batch_id,
            step_number=step_number,
            metadata={"duration_seconds": duration_seconds} if duration_seconds else None,
        )

    async def step_failed(
        self,
        game_id: uuid.UUID,
        step_number: int,
        step_name: str,
        error_message: str,
        batch_id: Optional[uuid.UUID] = None,
    ) -> GenerationLog:
        """Log a step failure."""
        return await self.error(
            "step_failed",
            f"Step {step_number} ({step_name}) failed: {error_message}",
            game_id=game_id,
            batch_id=batch_id,
            step_number=step_number,
            metadata={"error": error_message},
        )

    async def ai_request(
        self,
        game_id: uuid.UUID,
        step_number: int,
        prompt_type: str,
        batch_id: Optional[uuid.UUID] = None,
    ) -> GenerationLog:
        """Log an AI API request."""
        return await self.debug(
            "ai_request",
            f"Sending AI request: {prompt_type}",
            game_id=game_id,
            batch_id=batch_id,
            step_number=step_number,
        )

    async def ai_response(
        self,
        game_id: uuid.UUID,
        step_number: int,
        response_type: str,
        batch_id: Optional[uuid.UUID] = None,
    ) -> GenerationLog:
        """Log an AI API response."""
        return await self.debug(
            "ai_response",
            f"Received AI response: {response_type}",
            game_id=game_id,
            batch_id=batch_id,
            step_number=step_number,
        )

    async def github_action(
        self,
        game_id: uuid.UUID,
        step_number: int,
        action: str,
        details: str,
        batch_id: Optional[uuid.UUID] = None,
    ) -> GenerationLog:
        """Log a GitHub action."""
        return await self.info(
            "github_action",
            f"GitHub {action}: {details}",
            game_id=game_id,
            batch_id=batch_id,
            step_number=step_number,
        )
