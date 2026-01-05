"""
Analytics Service

Handles event ingestion and metrics aggregation.
"""

import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent, GameMetrics
from app.models.game import Game
from app.schemas.analytics import (
    AnalyticsEventCreate,
    GameMetricsSummary,
    MetricsSummary,
)

logger = structlog.get_logger()

# Valid event types
VALID_EVENT_TYPES = {
    "game_start",
    "level_start",
    "level_complete",
    "level_fail",
    "unlock_prompt_shown",
    "rewarded_ad_started",
    "rewarded_ad_completed",
    "rewarded_ad_failed",
    "level_unlocked",
    "iap_initiated",
    "iap_completed",
}


class AnalyticsService:
    """Service for analytics operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_event(self, data: AnalyticsEventCreate) -> AnalyticsEvent:
        """Record a single analytics event."""
        if data.event_type not in VALID_EVENT_TYPES:
            raise ValueError(f"Invalid event type: {data.event_type}")

        event = AnalyticsEvent(
            game_id=data.game_id,
            event_type=data.event_type,
            user_id=data.user_id,
            session_id=data.session_id,
            level=data.level,
            properties=data.properties or {},
            device_info=data.device_info or {},
            timestamp=data.timestamp,
        )

        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)

        return event

    async def record_events_batch(
        self,
        events: List[AnalyticsEventCreate],
    ) -> List[AnalyticsEvent]:
        """Record multiple analytics events."""
        recorded = []

        for data in events:
            if data.event_type not in VALID_EVENT_TYPES:
                logger.warning(
                    "invalid_event_type_skipped",
                    event_type=data.event_type,
                )
                continue

            event = AnalyticsEvent(
                game_id=data.game_id,
                event_type=data.event_type,
                user_id=data.user_id,
                session_id=data.session_id,
                level=data.level,
                properties=data.properties or {},
                device_info=data.device_info or {},
                timestamp=data.timestamp,
            )
            self.db.add(event)
            recorded.append(event)

        await self.db.commit()

        for event in recorded:
            await self.db.refresh(event)

        logger.info("events_batch_recorded", count=len(recorded))

        return recorded

    async def get_game_metrics(
        self,
        game_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[GameMetrics]:
        """Get daily metrics for a game."""
        query = (
            select(GameMetrics)
            .where(GameMetrics.game_id == game_id)
            .order_by(GameMetrics.date.desc())
        )

        if start_date:
            query = query.where(GameMetrics.date >= start_date)
        if end_date:
            query = query.where(GameMetrics.date <= end_date)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_metrics_summary(self, days: int = 30) -> MetricsSummary:
        """Get aggregated metrics summary across all games."""
        since_date = date.today() - timedelta(days=days)

        # Aggregate metrics
        result = await self.db.execute(
            select(
                func.count(func.distinct(GameMetrics.game_id)).label("total_games"),
                func.sum(GameMetrics.installs).label("total_installs"),
                func.sum(GameMetrics.dau).label("total_dau"),
                func.avg(GameMetrics.retention_d1).label("avg_retention_d1"),
                func.avg(GameMetrics.retention_d7).label("avg_retention_d7"),
                func.sum(GameMetrics.ad_revenue_cents).label("total_ad_revenue"),
                func.sum(GameMetrics.iap_revenue_cents).label("total_iap_revenue"),
            ).where(GameMetrics.date >= since_date)
        )

        row = result.one()

        # Get top games
        top_games_result = await self.db.execute(
            select(
                GameMetrics.game_id,
                func.sum(GameMetrics.installs).label("installs"),
                func.avg(GameMetrics.dau).label("avg_dau"),
                func.avg(GameMetrics.retention_d7).label("avg_retention"),
                func.avg(GameMetrics.score).label("avg_score"),
            )
            .where(GameMetrics.date >= since_date)
            .group_by(GameMetrics.game_id)
            .order_by(func.avg(GameMetrics.score).desc())
            .limit(10)
        )

        top_games = []
        for game_row in top_games_result.all():
            # Get game name
            game_result = await self.db.execute(
                select(Game.name).where(Game.id == game_row.game_id)
            )
            game_name = game_result.scalar_one_or_none() or "Unknown"

            top_games.append(
                GameMetricsSummary(
                    game_id=game_row.game_id,
                    game_name=game_name,
                    installs=int(game_row.installs or 0),
                    dau=int(game_row.avg_dau or 0),
                    retention_d7=float(game_row.avg_retention or 0),
                    score=float(game_row.avg_score or 0),
                )
            )

        return MetricsSummary(
            total_games=int(row.total_games or 0),
            total_installs=int(row.total_installs or 0),
            total_dau=int(row.total_dau or 0),
            avg_retention_d1=float(row.avg_retention_d1 or 0),
            avg_retention_d7=float(row.avg_retention_d7 or 0),
            total_ad_revenue_cents=int(row.total_ad_revenue or 0),
            total_iap_revenue_cents=int(row.total_iap_revenue or 0),
            top_games=top_games,
        )

    async def get_rankings(
        self,
        days: int = 7,
        limit: int = 10,
    ) -> List[GameMetrics]:
        """Get game rankings based on score."""
        since_date = date.today() - timedelta(days=days)

        # Get latest metrics per game with highest score
        result = await self.db.execute(
            select(GameMetrics)
            .where(GameMetrics.date >= since_date)
            .order_by(GameMetrics.score.desc())
            .limit(limit)
        )

        return list(result.scalars().all())

    async def trigger_aggregation(self, target_date: Optional[date] = None) -> None:
        """Trigger metrics aggregation task."""
        from app.workers.tasks import aggregate_daily_metrics

        if target_date is None:
            target_date = date.today() - timedelta(days=1)

        aggregate_daily_metrics.delay(target_date.isoformat())

        logger.info("aggregation_triggered", date=target_date.isoformat())

    async def aggregate_metrics_for_date(
        self,
        game_id: uuid.UUID,
        target_date: date,
    ) -> GameMetrics:
        """
        Aggregate metrics for a game on a specific date.

        Calculates:
        - DAU (unique users with any event)
        - Sessions (unique session_ids)
        - Level completions/failures
        - Ad metrics
        """
        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())

        # Get event counts
        events_result = await self.db.execute(
            select(
                func.count(func.distinct(AnalyticsEvent.user_id)).label("dau"),
                func.count(func.distinct(AnalyticsEvent.session_id)).label("sessions"),
            )
            .where(AnalyticsEvent.game_id == game_id)
            .where(AnalyticsEvent.timestamp >= start_dt)
            .where(AnalyticsEvent.timestamp <= end_dt)
        )
        events_row = events_result.one()

        # Count level completions/failures
        level_result = await self.db.execute(
            select(
                AnalyticsEvent.event_type,
                func.count().label("count"),
            )
            .where(AnalyticsEvent.game_id == game_id)
            .where(AnalyticsEvent.timestamp >= start_dt)
            .where(AnalyticsEvent.timestamp <= end_dt)
            .where(
                AnalyticsEvent.event_type.in_(["level_complete", "level_fail"])
            )
            .group_by(AnalyticsEvent.event_type)
        )

        level_counts = {row.event_type: row.count for row in level_result.all()}

        # Count ad events
        ad_result = await self.db.execute(
            select(func.count())
            .where(AnalyticsEvent.game_id == game_id)
            .where(AnalyticsEvent.timestamp >= start_dt)
            .where(AnalyticsEvent.timestamp <= end_dt)
            .where(AnalyticsEvent.event_type == "rewarded_ad_completed")
        )
        ad_impressions = ad_result.scalar() or 0

        # Calculate score
        dau = int(events_row.dau or 0)
        levels_completed = level_counts.get("level_complete", 0)
        levels_failed = level_counts.get("level_fail", 0)

        completion_rate = 0.0
        if levels_completed + levels_failed > 0:
            completion_rate = levels_completed / (levels_completed + levels_failed)

        # Simple score calculation
        score = (dau * 0.4) + (completion_rate * 100 * 0.3) + (ad_impressions * 0.3)

        # Create or update metrics
        existing = await self.db.execute(
            select(GameMetrics)
            .where(GameMetrics.game_id == game_id)
            .where(GameMetrics.date == target_date)
        )
        metrics = existing.scalar_one_or_none()

        if metrics:
            metrics.dau = dau
            metrics.sessions = int(events_row.sessions or 0)
            metrics.levels_completed = levels_completed
            metrics.levels_failed = levels_failed
            metrics.ad_impressions = ad_impressions
            metrics.score = score
        else:
            metrics = GameMetrics(
                game_id=game_id,
                date=target_date,
                dau=dau,
                sessions=int(events_row.sessions or 0),
                levels_completed=levels_completed,
                levels_failed=levels_failed,
                ad_impressions=ad_impressions,
                score=score,
            )
            self.db.add(metrics)

        await self.db.commit()
        await self.db.refresh(metrics)

        return metrics
