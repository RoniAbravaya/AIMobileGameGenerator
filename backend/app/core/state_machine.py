"""
Game Creation State Machine

Implements the 12-step workflow as a strict state machine where each step
must complete and validate before proceeding. Steps are idempotent and retry-safe.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set

import structlog

logger = structlog.get_logger()


class StepStatus(str, Enum):
    """Status of an individual workflow step."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class GameStatus(str, Enum):
    """Overall status of a game in the pipeline."""

    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PUBLISHED = "published"


class WorkflowStep(str, Enum):
    """The 12 mandatory workflow steps in order."""

    STEP_1_PRE_PRODUCTION = "pre_production"
    STEP_2_PROJECT_SETUP = "project_setup"
    STEP_3_ARCHITECTURE = "architecture"
    STEP_4_ANALYTICS_DESIGN = "analytics_design"
    STEP_5_ANALYTICS_IMPL = "analytics_implementation"
    STEP_6_CORE_PROTOTYPE = "core_prototype"
    STEP_7_ASSET_GENERATION = "asset_generation"
    STEP_8_VERTICAL_SLICE = "vertical_slice"
    STEP_9_CONTENT_PRODUCTION = "content_production"
    STEP_10_TESTING = "testing"
    STEP_11_RELEASE_PREP = "release_prep"
    STEP_12_POST_LAUNCH = "post_launch"


# Step metadata with validation requirements
STEP_DEFINITIONS: Dict[int, Dict[str, Any]] = {
    1: {
        "name": WorkflowStep.STEP_1_PRE_PRODUCTION,
        "title": "Pre-production",
        "description": "Generate GDD-lite per game",
        "inputs": ["genre", "constraints", "mechanic_pool"],
        "outputs": ["gdd_spec"],
        "validation": "json_schema",
        "timeout_seconds": 120,
    },
    2: {
        "name": WorkflowStep.STEP_2_PROJECT_SETUP,
        "title": "Project Setup",
        "description": "Clone/fork Flame template, configure Flutter",
        "inputs": ["gdd_spec", "template_repo"],
        "outputs": ["github_repo", "local_path"],
        "validation": "flutter_analyze",
        "timeout_seconds": 300,
    },
    3: {
        "name": WorkflowStep.STEP_3_ARCHITECTURE,
        "title": "Architecture Enforcement",
        "description": "Enforce standard layers and domain structure",
        "inputs": ["local_path", "gdd_spec"],
        "outputs": ["architecture_validated"],
        "validation": "compile_and_test",
        "timeout_seconds": 300,
    },
    4: {
        "name": WorkflowStep.STEP_4_ANALYTICS_DESIGN,
        "title": "Analytics Design",
        "description": "Generate Analytics Event Spec",
        "inputs": ["gdd_spec"],
        "outputs": ["analytics_spec"],
        "validation": "schema_consistency",
        "timeout_seconds": 60,
    },
    5: {
        "name": WorkflowStep.STEP_5_ANALYTICS_IMPL,
        "title": "Analytics Implementation",
        "description": "Implement AnalyticsService wrapper",
        "inputs": ["local_path", "analytics_spec"],
        "outputs": ["analytics_implemented"],
        "validation": "debug_verification",
        "timeout_seconds": 180,
    },
    6: {
        "name": WorkflowStep.STEP_6_CORE_PROTOTYPE,
        "title": "Core Prototype",
        "description": "Implement main mechanic loop with placeholders",
        "inputs": ["local_path", "gdd_spec", "selected_mechanics"],
        "outputs": ["prototype_playable"],
        "validation": "playable_loop",
        "timeout_seconds": 600,
    },
    7: {
        "name": WorkflowStep.STEP_7_ASSET_GENERATION,
        "title": "AI Asset Generation",
        "description": "Generate all art and audio assets via AI",
        "inputs": ["gdd_spec", "asset_style_guide"],
        "outputs": ["assets_generated", "texture_atlases"],
        "validation": "assets_load",
        "timeout_seconds": 900,
    },
    8: {
        "name": WorkflowStep.STEP_8_VERTICAL_SLICE,
        "title": "Vertical Slice",
        "description": "One fully polished level",
        "inputs": ["local_path", "assets_generated"],
        "outputs": ["vertical_slice_complete"],
        "validation": "fps_stable",
        "timeout_seconds": 600,
    },
    9: {
        "name": WorkflowStep.STEP_9_CONTENT_PRODUCTION,
        "title": "Content Production",
        "description": "Generate 10 level configs with ad gating",
        "inputs": ["local_path", "gdd_spec"],
        "outputs": ["levels_generated", "ad_gating_configured"],
        "validation": "level_regression",
        "timeout_seconds": 600,
    },
    10: {
        "name": WorkflowStep.STEP_10_TESTING,
        "title": "Testing",
        "description": "Unit tests, integration tests, QA checklist",
        "inputs": ["local_path"],
        "outputs": ["tests_passed", "qa_checklist"],
        "validation": "all_tests_pass",
        "timeout_seconds": 600,
    },
    11: {
        "name": WorkflowStep.STEP_11_RELEASE_PREP,
        "title": "Release Preparation",
        "description": "Optimization pass, build signing, store metadata",
        "inputs": ["local_path", "gdd_spec"],
        "outputs": ["release_ready", "store_metadata"],
        "validation": "release_checklist",
        "timeout_seconds": 600,
    },
    12: {
        "name": WorkflowStep.STEP_12_POST_LAUNCH,
        "title": "Post-Launch Analytics",
        "description": "Aggregate analytics, score game, update weights",
        "inputs": ["game_id", "analytics_events"],
        "outputs": ["game_score", "next_batch_constraints"],
        "validation": "constraints_generated",
        "timeout_seconds": 300,
    },
}


@dataclass
class StepResult:
    """Result of executing a workflow step."""

    success: bool
    step_number: int
    step_name: str
    artifacts: Dict[str, Any]
    validation_results: Dict[str, Any]
    error_message: Optional[str] = None
    logs: Optional[str] = None


@dataclass
class TransitionResult:
    """Result of a state transition attempt."""

    allowed: bool
    from_step: int
    to_step: int
    reason: Optional[str] = None


class GameStateMachine:
    """
    State machine for game creation workflow.

    Enforces the 12-step process with strict validation between steps.
    No step can be skipped (except via explicit skip for optional steps).
    """

    def __init__(self, game_id: str, current_step: int = 0):
        self.game_id = game_id
        self.current_step = current_step
        self._step_history: List[StepResult] = []

    @property
    def total_steps(self) -> int:
        """Total number of steps in the workflow."""
        return len(STEP_DEFINITIONS)

    @property
    def is_complete(self) -> bool:
        """Check if all steps are completed."""
        return self.current_step >= self.total_steps

    @property
    def current_step_definition(self) -> Optional[Dict[str, Any]]:
        """Get definition for current step."""
        if self.current_step == 0:
            return STEP_DEFINITIONS.get(1)
        return STEP_DEFINITIONS.get(self.current_step)

    @property
    def next_step_definition(self) -> Optional[Dict[str, Any]]:
        """Get definition for next step."""
        next_step = self.current_step + 1
        return STEP_DEFINITIONS.get(next_step)

    def can_transition_to(self, target_step: int) -> TransitionResult:
        """
        Check if transition to target step is allowed.

        Rules:
        - Can only move forward by exactly 1 step
        - Current step must be completed
        - Cannot skip steps
        """
        if target_step <= 0 or target_step > self.total_steps:
            return TransitionResult(
                allowed=False,
                from_step=self.current_step,
                to_step=target_step,
                reason=f"Invalid step number: {target_step}",
            )

        if target_step != self.current_step + 1:
            return TransitionResult(
                allowed=False,
                from_step=self.current_step,
                to_step=target_step,
                reason=f"Cannot skip steps. Current: {self.current_step}, requested: {target_step}",
            )

        return TransitionResult(
            allowed=True,
            from_step=self.current_step,
            to_step=target_step,
        )

    def transition_to(self, target_step: int, force: bool = False) -> TransitionResult:
        """
        Attempt to transition to target step.

        Args:
            target_step: The step number to transition to
            force: If True, skip validation (use with caution)
        """
        if not force:
            result = self.can_transition_to(target_step)
            if not result.allowed:
                logger.warning(
                    "transition_denied",
                    game_id=self.game_id,
                    from_step=self.current_step,
                    to_step=target_step,
                    reason=result.reason,
                )
                return result

        previous_step = self.current_step
        self.current_step = target_step

        logger.info(
            "step_transition",
            game_id=self.game_id,
            from_step=previous_step,
            to_step=target_step,
        )

        return TransitionResult(
            allowed=True,
            from_step=previous_step,
            to_step=target_step,
        )

    def record_step_result(self, result: StepResult) -> None:
        """Record the result of a step execution."""
        self._step_history.append(result)

        if result.success:
            logger.info(
                "step_completed",
                game_id=self.game_id,
                step_number=result.step_number,
                step_name=result.step_name,
            )
        else:
            logger.error(
                "step_failed",
                game_id=self.game_id,
                step_number=result.step_number,
                step_name=result.step_name,
                error=result.error_message,
            )

    def get_required_inputs(self, step_number: int) -> List[str]:
        """Get required inputs for a step."""
        step_def = STEP_DEFINITIONS.get(step_number, {})
        return step_def.get("inputs", [])

    def get_expected_outputs(self, step_number: int) -> List[str]:
        """Get expected outputs for a step."""
        step_def = STEP_DEFINITIONS.get(step_number, {})
        return step_def.get("outputs", [])

    def get_validation_type(self, step_number: int) -> str:
        """Get validation type for a step."""
        step_def = STEP_DEFINITIONS.get(step_number, {})
        return step_def.get("validation", "none")


class WorkflowOrchestrator:
    """
    Orchestrates the execution of the game creation workflow.

    Responsible for:
    - Executing steps in order
    - Handling retries
    - Persisting state
    - Coordinating with Celery workers
    """

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self._step_executors: Dict[int, Callable] = {}

    def register_executor(self, step_number: int, executor: Callable) -> None:
        """Register an executor function for a step."""
        self._step_executors[step_number] = executor

    def get_executor(self, step_number: int) -> Optional[Callable]:
        """Get the executor for a step."""
        return self._step_executors.get(step_number)

    async def execute_step(
        self,
        state_machine: GameStateMachine,
        step_number: int,
        inputs: Dict[str, Any],
        retry_count: int = 0,
    ) -> StepResult:
        """
        Execute a single workflow step.

        Args:
            state_machine: The game's state machine
            step_number: Which step to execute
            inputs: Required inputs for the step
            retry_count: Current retry attempt number
        """
        step_def = STEP_DEFINITIONS.get(step_number)
        if not step_def:
            return StepResult(
                success=False,
                step_number=step_number,
                step_name="unknown",
                artifacts={},
                validation_results={},
                error_message=f"Invalid step number: {step_number}",
            )

        # Validate inputs
        required_inputs = step_def.get("inputs", [])
        missing_inputs = [i for i in required_inputs if i not in inputs]
        if missing_inputs:
            return StepResult(
                success=False,
                step_number=step_number,
                step_name=step_def["name"].value,
                artifacts={},
                validation_results={},
                error_message=f"Missing required inputs: {missing_inputs}",
            )

        # Get executor
        executor = self.get_executor(step_number)
        if not executor:
            return StepResult(
                success=False,
                step_number=step_number,
                step_name=step_def["name"].value,
                artifacts={},
                validation_results={},
                error_message=f"No executor registered for step {step_number}",
            )

        # Execute
        try:
            logger.info(
                "step_executing",
                game_id=state_machine.game_id,
                step_number=step_number,
                step_name=step_def["name"].value,
                retry_count=retry_count,
            )

            result = await executor(state_machine.game_id, inputs)

            if result.success:
                state_machine.transition_to(step_number)

            state_machine.record_step_result(result)
            return result

        except Exception as e:
            logger.exception(
                "step_exception",
                game_id=state_machine.game_id,
                step_number=step_number,
                error=str(e),
            )

            return StepResult(
                success=False,
                step_number=step_number,
                step_name=step_def["name"].value,
                artifacts={},
                validation_results={},
                error_message=str(e),
            )

    def should_retry(self, result: StepResult, retry_count: int) -> bool:
        """Determine if a failed step should be retried."""
        if result.success:
            return False

        if retry_count >= self.max_retries:
            return False

        # Don't retry certain errors
        non_retryable_errors = [
            "Invalid step number",
            "Missing required inputs",
            "No executor registered",
        ]

        if result.error_message:
            for error in non_retryable_errors:
                if error in result.error_message:
                    return False

        return True
