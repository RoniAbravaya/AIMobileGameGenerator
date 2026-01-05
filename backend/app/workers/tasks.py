"""
Celery Tasks

Main task definitions for the game generation pipeline.
"""

import asyncio
import uuid as uuid_module
from datetime import date, timedelta
from typing import Optional

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger()


def run_async(coro):
    """Helper to run async code in sync context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def process_batch(self, batch_id: str):
    """
    Process a batch of games.

    Orchestrates the generation of all games in a batch.
    """
    logger.info("batch_processing_started", batch_id=batch_id)

    async def _process():
        from app.db.session import async_session
        from app.services.batch_service import BatchService
        from app.services.game_service import GameService

        async with async_session() as db:
            batch_service = BatchService(db)
            game_service = GameService(db)

            # Convert string to UUID
            batch_uuid = uuid_module.UUID(batch_id)
            batch = await batch_service.get_batch(batch_uuid)
            if not batch:
                logger.error("batch_not_found", batch_id=batch_id)
                return

            # Process each game
            for game in batch.games:
                if game.status == "cancelled":
                    continue

                # Initialize steps if not done
                steps = await game_service.get_game_steps(game.id)
                if not steps:
                    await game_service._initialize_steps(game.id)

                # Start with step 1
                execute_step.delay(str(game.id), 1)

            logger.info(
                "batch_games_queued",
                batch_id=batch_id,
                game_count=len(batch.games),
            )

    run_async(_process())


@celery_app.task(bind=True, max_retries=3)
def execute_step(self, game_id: str, step_number: int):
    """
    Execute a single workflow step for a game.

    Steps are executed sequentially - completion of one step
    triggers the next step.
    """
    logger.info(
        "step_execution_started",
        game_id=game_id,
        step_number=step_number,
    )

    async def _execute():
        from app.db.session import async_session
        from app.services.game_service import GameService
        from app.workers.step_executors import get_step_executor

        async with async_session() as db:
            game_service = GameService(db)
            
            # Convert string to UUID
            game_uuid = uuid_module.UUID(game_id)
            game = await game_service.get_game(game_uuid)

            if not game:
                logger.error("game_not_found", game_id=game_id)
                return

            if game.status == "cancelled":
                logger.info("game_cancelled_skipping", game_id=game_id)
                return

            # Get step and mark as running
            step = await game_service.get_step(game_uuid, step_number)
            if not step:
                logger.error(
                    "step_not_found",
                    game_id=game_id,
                    step_number=step_number,
                )
                return

            await game_service.update_step_status(
                game_uuid,
                step_number,
                status="running",
            )

            # Get and execute the step
            executor = get_step_executor(step_number)
            if not executor:
                await game_service.update_step_status(
                    game_uuid,
                    step_number,
                    status="failed",
                    error_message=f"No executor for step {step_number}",
                )
                return

            try:
                result = await executor.execute(db, game)

                if result["success"]:
                    await game_service.update_step_status(
                        game_uuid,
                        step_number,
                        status="completed",
                        artifacts=result.get("artifacts", {}),
                        validation_results=result.get("validation", {}),
                        logs=result.get("logs"),
                    )

                    # Trigger next step if not at end
                    if step_number < 12:
                        execute_step.delay(game_id, step_number + 1)
                    else:
                        logger.info(
                            "game_generation_complete",
                            game_id=game_id,
                        )
                else:
                    step = await game_service.get_step(game_uuid, step_number)
                    if step and step.can_retry:
                        # Retry
                        await game_service.update_step_status(
                            game_uuid,
                            step_number,
                            status="pending",
                            error_message=result.get("error"),
                        )
                        raise self.retry(countdown=60)
                    else:
                        await game_service.update_step_status(
                            game_uuid,
                            step_number,
                            status="failed",
                            error_message=result.get("error"),
                            logs=result.get("logs"),
                        )

            except Exception as e:
                logger.exception(
                    "step_execution_error",
                    game_id=game_id,
                    step_number=step_number,
                    error=str(e),
                )

                step = await game_service.get_step(game_uuid, step_number)
                if step and step.retry_count < step.max_retries:
                    step.retry_count += 1
                    await db.commit()
                    raise self.retry(exc=e, countdown=60)
                else:
                    await game_service.update_step_status(
                        game_uuid,
                        step_number,
                        status="failed",
                        error_message=str(e),
                    )

    run_async(_execute())


@celery_app.task
def generate_assets(game_id: str, asset_type: str, spec: dict):
    """Generate AI assets for a game."""
    logger.info(
        "asset_generation_started",
        game_id=game_id,
        asset_type=asset_type,
    )

    async def _generate():
        from app.db.session import async_session
        from app.services.asset_service import get_asset_service
        from app.services.game_service import GameService

        async with async_session() as db:
            game_service = GameService(db)
            game_uuid = uuid_module.UUID(game_id)
            game = await game_service.get_game(game_uuid)
            
            if not game or not game.gdd_spec:
                return {"success": False, "error": "Game or GDD not found"}
            
            asset_service = get_asset_service()
            result = await asset_service.generate_asset(
                game_id=game_id,
                asset_type=asset_type,
                asset_name=spec.get("name", asset_type),
                description=spec.get("description", ""),
                style_guide=game.gdd_spec.get("asset_style_guide", {}),
                output_path=asset_service.storage_path / game_id,
            )
            return result

    return run_async(_generate())


@celery_app.task
def aggregate_daily_metrics(target_date: Optional[str] = None):
    """Aggregate metrics for all games."""
    if target_date:
        _date = date.fromisoformat(target_date)
    else:
        _date = date.today() - timedelta(days=1)

    logger.info("metrics_aggregation_started", date=str(_date))

    async def _aggregate():
        from app.db.session import async_session
        from app.services.analytics_service import AnalyticsService
        from app.services.game_service import GameService

        async with async_session() as db:
            game_service = GameService(db)
            analytics_service = AnalyticsService(db)

            # Get all active games
            games = await game_service.list_games(
                limit=1000,
                status="completed",
            )

            for game in games:
                try:
                    await analytics_service.aggregate_metrics_for_date(
                        game.id,
                        _date,
                    )
                except Exception as e:
                    logger.error(
                        "metrics_aggregation_error",
                        game_id=str(game.id),
                        error=str(e),
                    )

            logger.info(
                "metrics_aggregation_completed",
                date=str(_date),
                game_count=len(games),
            )

    run_async(_aggregate())


@celery_app.task
def build_game(game_id: str, build_type: str = "debug"):
    """Trigger a game build via GitHub Actions."""
    logger.info(
        "build_triggered",
        game_id=game_id,
        build_type=build_type,
    )

    async def _build():
        from app.db.session import async_session
        from app.services.game_service import GameService
        from app.services.github_service import get_github_service
        from app.models.build import GameBuild

        async with async_session() as db:
            game_service = GameService(db)
            github_service = get_github_service()
            
            # Convert string to UUID
            game_uuid = uuid_module.UUID(game_id)
            game = await game_service.get_game(game_uuid)

            if not game or not game.github_repo:
                logger.error(
                    "build_failed_no_repo",
                    game_id=game_id,
                )
                return {"success": False, "error": "No game or repo found"}

            # Trigger GitHub Actions workflow
            workflow_result = await github_service.trigger_workflow(
                repo_name=game.github_repo,
                workflow_id="build.yml",
                ref="main",
                inputs={"build_type": build_type},
            )

            # Create build record
            build = GameBuild(
                game_id=game.id,
                build_type=build_type,
                status="pending" if workflow_result["success"] else "failed",
                github_workflow_run_id=workflow_result.get("run_id"),
                github_workflow_url=workflow_result.get("url"),
            )
            db.add(build)
            await db.commit()

            logger.info(
                "build_triggered",
                game_id=game_id,
                repo=game.github_repo,
                build_type=build_type,
                success=workflow_result["success"],
            )
            
            return {
                "success": workflow_result["success"],
                "build_id": str(build.id),
                "repo": game.github_repo,
                "build_type": build_type,
                "workflow_triggered": workflow_result["success"],
            }

    return run_async(_build())
