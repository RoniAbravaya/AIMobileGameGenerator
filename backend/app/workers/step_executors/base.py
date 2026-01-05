"""
Base Step Executor

Abstract base class for all workflow step executors.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game

logger = structlog.get_logger()


class StepResult:
    """Result of a step execution."""

    def __init__(
        self,
        success: bool,
        artifacts: Dict[str, Any] = None,
        validation: Dict[str, Any] = None,
        error: str = None,
        logs: str = None,
    ):
        self.success = success
        self.artifacts = artifacts or {}
        self.validation = validation or {}
        self.error = error
        self.logs = logs

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "artifacts": self.artifacts,
            "validation": self.validation,
            "error": self.error,
            "logs": self.logs,
        }


class BaseStepExecutor(ABC):
    """
    Abstract base class for step executors.

    Each step executor must implement:
    - execute(): Main execution logic
    - validate(): Validation logic

    Steps must be:
    - Idempotent: Running multiple times produces same result
    - Retry-safe: Can be safely retried on failure
    - Artifact-producing: Must output concrete artifacts
    """

    step_number: int = 0
    step_name: str = "base"

    def __init__(self):
        self.logger = structlog.get_logger().bind(
            step_number=self.step_number,
            step_name=self.step_name,
        )

    @abstractmethod
    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """
        Execute the step.

        Args:
            db: Database session
            game: The game being processed

        Returns:
            Dict with:
            - success: bool
            - artifacts: dict of produced artifacts
            - validation: dict of validation results
            - error: optional error message
            - logs: optional execution logs
        """
        pass

    @abstractmethod
    async def validate(self, db: AsyncSession, game: Game, artifacts: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate the step outputs.

        Args:
            db: Database session
            game: The game being processed
            artifacts: Produced artifacts to validate

        Returns:
            Dict with:
            - valid: bool
            - errors: list of validation errors
            - warnings: list of warnings
        """
        pass

    async def rollback(self, db: AsyncSession, game: Game) -> None:
        """
        Rollback any changes made by this step.

        Optional - implement if step makes reversible changes.
        """
        pass

    def get_required_inputs(self) -> list:
        """Get list of required inputs for this step."""
        from app.core.state_machine import STEP_DEFINITIONS

        step_def = STEP_DEFINITIONS.get(self.step_number, {})
        return step_def.get("inputs", [])

    def get_expected_outputs(self) -> list:
        """Get list of expected outputs from this step."""
        from app.core.state_machine import STEP_DEFINITIONS

        step_def = STEP_DEFINITIONS.get(self.step_number, {})
        return step_def.get("outputs", [])

    def check_inputs(self, game: Game) -> tuple:
        """
        Check if all required inputs are available.

        Returns:
            Tuple of (all_present: bool, missing: list)
        """
        required = self.get_required_inputs()
        missing = []

        # Check based on input type
        input_checkers = {
            "genre": lambda g: bool(g.genre),
            "gdd_spec": lambda g: bool(g.gdd_spec),
            "analytics_spec": lambda g: bool(g.analytics_spec),
            "selected_mechanics": lambda g: bool(g.selected_mechanics),
            "github_repo": lambda g: bool(g.github_repo),
            "constraints": lambda g: True,  # Optional
            "mechanic_pool": lambda g: True,  # Will be fetched
            "template_repo": lambda g: True,  # Will be selected
            "local_path": lambda g: bool(g.github_repo),  # Derived from repo
        }

        for input_name in required:
            checker = input_checkers.get(input_name, lambda g: True)
            if not checker(game):
                missing.append(input_name)

        return len(missing) == 0, missing
