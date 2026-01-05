"""
Step 12: Post-Launch Analytics & Learning Loop

Handles post-launch activities:
- Aggregate analytics data
- Score games based on performance
- Update mechanic weights for next batch
- Generate constraints for future batches
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.analytics import AnalyticsEvent, GameMetrics
from app.models.learning import LearningWeight
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


class PostLaunchStep(BaseStepExecutor):
    """
    Step 12: Post-launch analytics and learning loop.
    
    Analyzes game performance and generates insights for future batches.
    """

    step_number = 12
    step_name = "post_launch"

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Execute post-launch analytics."""
        self.logger.info("running_post_launch", game_id=str(game.id))

        logs = []
        logs.append(f"Starting post-launch analytics for {game.name}")

        try:
            # Aggregate analytics
            logs.append("\n--- Aggregating Analytics ---")
            metrics = await self._aggregate_analytics(db, game.id)
            logs.append(f"✓ Processed {metrics.get('total_events', 0)} events")

            # Calculate game score
            logs.append("\n--- Calculating Game Score ---")
            score = self._calculate_game_score(metrics)
            logs.append(f"✓ Game score: {score:.2f}")

            # Store metrics
            await self._store_metrics(db, game.id, metrics, score)
            logs.append("✓ Metrics stored in database")

            # Update learning weights
            logs.append("\n--- Updating Learning Weights ---")
            await self._update_learning_weights(db, game, metrics, score)
            logs.append("✓ Learning weights updated")

            # Generate next-batch constraints
            logs.append("\n--- Generating Batch Constraints ---")
            constraints = await self._generate_constraints(db, game, metrics)
            logs.append(f"✓ Generated {len(constraints)} constraints")

            # Store constraints in game record
            if game.gdd_spec:
                game.gdd_spec["post_launch_metrics"] = {
                    "score": score,
                    "metrics": metrics,
                    "constraints_generated": constraints,
                    "completed_at": datetime.utcnow().isoformat(),
                }
                await db.commit()

            logs.append("\n--- Post-Launch Complete ---")

            validation = await self.validate(db, game, {"metrics": metrics, "score": score})

            return {
                "success": validation["valid"],
                "artifacts": {
                    "game_score": score,
                    "metrics": metrics,
                    "constraints": constraints,
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("post_launch_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    async def _aggregate_analytics(
        self,
        db: AsyncSession,
        game_id: UUID,
    ) -> Dict[str, Any]:
        """Aggregate analytics data for the game."""
        
        # Query analytics events
        now = datetime.utcnow()
        since = now - timedelta(days=30)  # Last 30 days
        
        result = await db.execute(
            select(AnalyticsEvent)
            .where(AnalyticsEvent.game_id == game_id)
            .where(AnalyticsEvent.created_at >= since)
        )
        events = result.scalars().all()

        # Calculate metrics
        total_events = len(events)
        event_counts = {}
        for event in events:
            event_counts[event.event_name] = event_counts.get(event.event_name, 0) + 1

        # Calculate key metrics
        game_starts = event_counts.get("game_start", 0)
        level_completes = event_counts.get("level_complete", 0)
        level_fails = event_counts.get("level_fail", 0)
        ad_shown = event_counts.get("unlock_prompt_shown", 0)
        ad_completed = event_counts.get("rewarded_ad_completed", 0)
        ad_failed = event_counts.get("rewarded_ad_failed", 0)

        # Calculate rates
        completion_rate = level_completes / max(game_starts, 1)
        fail_rate = level_fails / max(level_completes + level_fails, 1)
        ad_opt_in_rate = ad_completed / max(ad_shown, 1) if ad_shown > 0 else 0

        # Calculate retention proxy (users who completed level 3+)
        level_3_plus = sum(
            1 for e in events 
            if e.event_name == "level_complete" 
            and e.event_params.get("level", 0) >= 3
        )
        retention_proxy = level_3_plus / max(game_starts, 1)

        return {
            "total_events": total_events,
            "event_counts": event_counts,
            "game_starts": game_starts,
            "level_completes": level_completes,
            "level_fails": level_fails,
            "completion_rate": completion_rate,
            "fail_rate": fail_rate,
            "ad_shown": ad_shown,
            "ad_completed": ad_completed,
            "ad_opt_in_rate": ad_opt_in_rate,
            "retention_proxy": retention_proxy,
            "period_days": 30,
        }

    def _calculate_game_score(self, metrics: Dict[str, Any]) -> float:
        """
        Calculate overall game score.
        
        Score formula:
        - Retention proxy (40%): How many users reach level 3+
        - Completion rate (30%): Level completion vs. starts
        - Ad opt-in rate (30%): Willingness to watch ads
        """
        retention = metrics.get("retention_proxy", 0)
        completion = metrics.get("completion_rate", 0)
        ad_opt_in = metrics.get("ad_opt_in_rate", 0)

        # Weighted score (0-100)
        score = (
            retention * 40 +
            completion * 30 +
            ad_opt_in * 30
        )

        return min(100, max(0, score))

    async def _store_metrics(
        self,
        db: AsyncSession,
        game_id: UUID,
        metrics: Dict[str, Any],
        score: float,
    ) -> None:
        """Store metrics in database."""
        
        game_metrics = GameMetrics(
            game_id=game_id,
            total_plays=metrics.get("game_starts", 0),
            total_completions=metrics.get("level_completes", 0),
            average_score=0,  # Would calculate from events
            average_session_length=0,  # Would calculate from events
            retention_day_1=metrics.get("retention_proxy", 0),
            retention_day_7=0,
            ad_impressions=metrics.get("ad_shown", 0),
            ad_clicks=metrics.get("ad_completed", 0),
            revenue_estimate=metrics.get("ad_completed", 0) * 0.01,  # Estimated $0.01 per ad
            overall_score=score,
        )

        db.add(game_metrics)
        await db.commit()

    async def _update_learning_weights(
        self,
        db: AsyncSession,
        game: Game,
        metrics: Dict[str, Any],
        score: float,
    ) -> None:
        """Update learning weights based on game performance."""
        
        gdd = game.gdd_spec or {}
        mechanics = gdd.get("mechanics", {})
        primary_mechanic = mechanics.get("primary", "")
        selected_mechanics = mechanics.get("selected_from_library", [])

        # Determine performance tier
        if score >= 70:
            weight_adjustment = 0.1  # Boost
        elif score >= 40:
            weight_adjustment = 0  # Neutral
        else:
            weight_adjustment = -0.05  # Penalty

        # Update weights for used mechanics
        for mechanic_name in selected_mechanics + [primary_mechanic]:
            if not mechanic_name:
                continue

            result = await db.execute(
                select(LearningWeight)
                .where(LearningWeight.mechanic_name == mechanic_name)
            )
            weight = result.scalar_one_or_none()

            if weight:
                weight.weight = max(0.1, min(2.0, weight.weight + weight_adjustment))
                weight.sample_count += 1
                weight.last_updated = datetime.utcnow()
            else:
                weight = LearningWeight(
                    mechanic_name=mechanic_name,
                    genre=game.genre,
                    weight=1.0 + weight_adjustment,
                    sample_count=1,
                )
                db.add(weight)

        # Update genre weight
        genre_weight_result = await db.execute(
            select(LearningWeight)
            .where(LearningWeight.mechanic_name == f"genre:{game.genre}")
        )
        genre_weight = genre_weight_result.scalar_one_or_none()

        if genre_weight:
            genre_weight.weight = max(0.5, min(2.0, genre_weight.weight + weight_adjustment))
            genre_weight.sample_count += 1
        else:
            genre_weight = LearningWeight(
                mechanic_name=f"genre:{game.genre}",
                genre=game.genre,
                weight=1.0 + weight_adjustment,
                sample_count=1,
            )
            db.add(genre_weight)

        await db.commit()

    async def _generate_constraints(
        self,
        db: AsyncSession,
        game: Game,
        metrics: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Generate constraints for the next batch."""
        constraints = []

        # Get top-performing mechanics
        result = await db.execute(
            select(LearningWeight)
            .where(LearningWeight.weight >= 1.2)
            .where(LearningWeight.sample_count >= 3)
            .order_by(LearningWeight.weight.desc())
            .limit(5)
        )
        top_mechanics = result.scalars().all()

        if top_mechanics:
            constraints.append({
                "type": "prefer_mechanics",
                "value": [m.mechanic_name for m in top_mechanics],
                "reason": "High-performing mechanics from past games",
            })

        # Get underperforming mechanics to avoid
        result = await db.execute(
            select(LearningWeight)
            .where(LearningWeight.weight <= 0.5)
            .where(LearningWeight.sample_count >= 3)
            .order_by(LearningWeight.weight.asc())
            .limit(3)
        )
        poor_mechanics = result.scalars().all()

        if poor_mechanics:
            constraints.append({
                "type": "avoid_mechanics",
                "value": [m.mechanic_name for m in poor_mechanics],
                "reason": "Low-performing mechanics from past games",
            })

        # Check if completion rate is too low
        if metrics.get("completion_rate", 0) < 0.3:
            constraints.append({
                "type": "reduce_difficulty",
                "value": 0.8,  # Scale factor
                "reason": "Low completion rate indicates difficulty issues",
            })

        # Check if ad opt-in is too low
        if metrics.get("ad_opt_in_rate", 0) < 0.2:
            constraints.append({
                "type": "improve_value_proposition",
                "value": True,
                "reason": "Low ad opt-in suggests players don't see value in unlocking",
            })

        # Genre preference based on score
        score = self._calculate_game_score(metrics)
        if score >= 60:
            constraints.append({
                "type": "prefer_genre",
                "value": game.genre,
                "reason": f"Genre performed well (score: {score:.1f})",
            })

        return constraints

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate post-launch step."""
        errors = []
        warnings = []

        metrics = artifacts.get("metrics", {})
        score = artifacts.get("score", 0)

        if metrics.get("total_events", 0) == 0:
            warnings.append("No analytics events found - metrics based on defaults")

        if score < 20:
            warnings.append(f"Low game score ({score:.1f}) - consider analyzing issues")

        return {
            "valid": True,  # Post-launch always "succeeds" for workflow completion
            "errors": errors,
            "warnings": warnings,
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback post-launch step."""
        # Remove stored metrics
        await db.execute(
            GameMetrics.__table__.delete().where(GameMetrics.game_id == game.id)
        )
        await db.commit()
        return True
