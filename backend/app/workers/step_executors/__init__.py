"""
Step Executors

Individual executors for each workflow step.
Each step is idempotent and produces concrete artifacts.
All 12 steps are fully implemented.
"""

from typing import Optional

from app.workers.step_executors.base import BaseStepExecutor
from app.workers.step_executors.step_01_pre_production import PreProductionStep
from app.workers.step_executors.step_02_project_setup import ProjectSetupStep
from app.workers.step_executors.step_03_architecture import ArchitectureStep
from app.workers.step_executors.step_04_analytics_design import AnalyticsDesignStep
from app.workers.step_executors.step_05_analytics_impl import AnalyticsImplStep
from app.workers.step_executors.step_06_core_prototype import CorePrototypeStep
from app.workers.step_executors.step_07_asset_generation import AssetGenerationStep
from app.workers.step_executors.step_08_vertical_slice import VerticalSliceStep
from app.workers.step_executors.step_09_content_production import ContentProductionStep
from app.workers.step_executors.step_10_testing import TestingStep
from app.workers.step_executors.step_11_release_prep import ReleasePrepStep
from app.workers.step_executors.step_12_post_launch import PostLaunchStep


# Registry of step executors - all 12 steps fully implemented
STEP_EXECUTORS = {
    1: PreProductionStep,       # GDD-lite generation with similarity check
    2: ProjectSetupStep,        # GitHub repo creation and template cloning
    3: ArchitectureStep,        # Code architecture and Dart code generation
    4: AnalyticsDesignStep,     # Analytics event specification
    5: AnalyticsImplStep,       # Analytics service implementation
    6: CorePrototypeStep,       # Main gameplay loop implementation
    7: AssetGenerationStep,     # AI-powered asset generation
    8: VerticalSliceStep,       # Polished single level
    9: ContentProductionStep,   # All 10 level configurations
    10: TestingStep,            # Unit/integration tests and QA checklist
    11: ReleasePrepStep,        # Release configuration and store metadata
    12: PostLaunchStep,         # Analytics aggregation and learning loop
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
    "AnalyticsDesignStep",
    "AnalyticsImplStep",
    "CorePrototypeStep",
    "AssetGenerationStep",
    "VerticalSliceStep",
    "ContentProductionStep",
    "TestingStep",
    "ReleasePrepStep",
    "PostLaunchStep",
    "get_step_executor",
    "STEP_EXECUTORS",
]
