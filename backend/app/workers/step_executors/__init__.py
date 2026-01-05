"""
Step Executors

Individual executors for each workflow step.
Each step is idempotent and produces concrete artifacts.
"""

from typing import Optional

from app.workers.step_executors.base import BaseStepExecutor
from app.workers.step_executors.step_01_pre_production import PreProductionStep
from app.workers.step_executors.step_02_project_setup import ProjectSetupStep
from app.workers.step_executors.step_03_architecture import ArchitectureStep


# Registry of step executors
STEP_EXECUTORS = {
    1: PreProductionStep,
    2: ProjectSetupStep,
    3: ArchitectureStep,
    # Steps 4-12 are stubbed for now
}


def get_step_executor(step_number: int) -> Optional[BaseStepExecutor]:
    """Get the executor for a step number."""
    executor_class = STEP_EXECUTORS.get(step_number)
    if executor_class:
        return executor_class()
    return None


__all__ = [
    "BaseStepExecutor",
    "PreProductionStep",
    "ProjectSetupStep",
    "ArchitectureStep",
    "get_step_executor",
]
