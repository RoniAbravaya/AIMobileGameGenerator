"""
Similarity Service

Checks similarity between games to ensure diversity in generated content.
If a new game is >80% similar to any existing game, it triggers regeneration.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game

logger = structlog.get_logger()

# Similarity thresholds
SIMILARITY_THRESHOLD = 0.80  # 80% - games above this are considered too similar
MAX_REGENERATION_ATTEMPTS = 5  # Maximum times to retry before accepting


class SimilarityResult:
    """Result of a similarity comparison."""

    def __init__(
        self,
        is_similar: bool,
        similarity_score: float,
        most_similar_game_id: Optional[uuid.UUID] = None,
        breakdown: Dict[str, float] = None,
    ):
        self.is_similar = is_similar
        self.similarity_score = similarity_score
        self.most_similar_game_id = most_similar_game_id
        self.breakdown = breakdown or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_similar": self.is_similar,
            "similarity_score": self.similarity_score,
            "most_similar_game_id": str(self.most_similar_game_id) if self.most_similar_game_id else None,
            "breakdown": self.breakdown,
            "threshold": SIMILARITY_THRESHOLD,
        }


class SimilarityService:
    """
    Service for checking similarity between games.
    
    Compares multiple aspects of games:
    - Genre (exact match)
    - Mechanics (Jaccard similarity)
    - Core loop elements
    - Visual style
    - Difficulty curve
    - Economy settings
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_similarity(
        self,
        new_game: Game,
        exclude_game_ids: List[uuid.UUID] = None,
    ) -> SimilarityResult:
        """
        Check if a new game is too similar to existing games.
        
        Args:
            new_game: The newly generated game to check
            exclude_game_ids: Game IDs to exclude from comparison (e.g., the game itself)
            
        Returns:
            SimilarityResult with similarity score and details
        """
        exclude_ids = exclude_game_ids or []
        exclude_ids.append(new_game.id)

        # Get all existing games with GDD specs
        existing_games = await self._get_existing_games(exclude_ids)

        if not existing_games:
            logger.info(
                "no_existing_games_for_comparison",
                game_id=str(new_game.id),
            )
            return SimilarityResult(
                is_similar=False,
                similarity_score=0.0,
            )

        # Compare against each existing game
        max_similarity = 0.0
        most_similar_game = None
        most_similar_breakdown = {}

        for existing_game in existing_games:
            similarity, breakdown = self._calculate_similarity(new_game, existing_game)
            
            if similarity > max_similarity:
                max_similarity = similarity
                most_similar_game = existing_game
                most_similar_breakdown = breakdown

        is_too_similar = max_similarity >= SIMILARITY_THRESHOLD

        logger.info(
            "similarity_check_complete",
            game_id=str(new_game.id),
            max_similarity=max_similarity,
            is_too_similar=is_too_similar,
            most_similar_game_id=str(most_similar_game.id) if most_similar_game else None,
        )

        return SimilarityResult(
            is_similar=is_too_similar,
            similarity_score=max_similarity,
            most_similar_game_id=most_similar_game.id if most_similar_game else None,
            breakdown=most_similar_breakdown,
        )

    async def _get_existing_games(
        self,
        exclude_ids: List[uuid.UUID],
    ) -> List[Game]:
        """Get all games with GDD specs for comparison."""
        query = (
            select(Game)
            .where(Game.id.notin_(exclude_ids))
            .where(Game.gdd_spec.isnot(None))
            .where(Game.status.in_(["created", "in_progress", "completed", "published"]))
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    def _calculate_similarity(
        self,
        game_a: Game,
        game_b: Game,
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate similarity between two games.
        
        Returns:
            Tuple of (overall_similarity, breakdown_dict)
        """
        breakdown = {}
        weights = {
            "genre": 0.20,
            "mechanics": 0.25,
            "core_loop": 0.15,
            "visual_style": 0.15,
            "difficulty": 0.10,
            "economy": 0.10,
            "name": 0.05,
        }

        gdd_a = game_a.gdd_spec or {}
        gdd_b = game_b.gdd_spec or {}

        # Genre similarity (exact match = 1.0, different = 0.0)
        breakdown["genre"] = 1.0 if game_a.genre == game_b.genre else 0.0

        # Mechanics similarity (Jaccard index)
        breakdown["mechanics"] = self._jaccard_similarity(
            game_a.selected_mechanics or [],
            game_b.selected_mechanics or [],
        )

        # Core loop similarity
        breakdown["core_loop"] = self._compare_core_loop(
            gdd_a.get("core_loop", {}),
            gdd_b.get("core_loop", {}),
        )

        # Visual style similarity
        breakdown["visual_style"] = self._compare_visual_style(
            gdd_a.get("asset_style_guide", {}),
            gdd_b.get("asset_style_guide", {}),
        )

        # Difficulty curve similarity
        breakdown["difficulty"] = self._compare_difficulty(
            gdd_a.get("difficulty_curve", {}),
            gdd_b.get("difficulty_curve", {}),
        )

        # Economy similarity
        breakdown["economy"] = self._compare_economy(
            gdd_a.get("economy", {}),
            gdd_b.get("economy", {}),
        )

        # Name similarity (simple word overlap)
        breakdown["name"] = self._name_similarity(game_a.name, game_b.name)

        # Calculate weighted overall similarity
        overall = sum(
            breakdown[key] * weights[key]
            for key in weights
        )

        return overall, breakdown

    def _jaccard_similarity(self, list_a: List, list_b: List) -> float:
        """Calculate Jaccard similarity between two lists."""
        if not list_a and not list_b:
            return 0.0

        set_a = set(list_a)
        set_b = set(list_b)

        intersection = len(set_a & set_b)
        union = len(set_a | set_b)

        if union == 0:
            return 0.0

        return intersection / union

    def _compare_core_loop(self, loop_a: Dict, loop_b: Dict) -> float:
        """Compare core loop elements."""
        if not loop_a or not loop_b:
            return 0.0

        score = 0.0
        checks = 0

        # Primary action
        if loop_a.get("primary_action") == loop_b.get("primary_action"):
            score += 1.0
        checks += 1

        # Reward trigger
        if loop_a.get("reward_trigger") == loop_b.get("reward_trigger"):
            score += 1.0
        checks += 1

        # Session length (within 30 seconds)
        len_a = loop_a.get("session_length_target_seconds", 0)
        len_b = loop_b.get("session_length_target_seconds", 0)
        if abs(len_a - len_b) <= 30:
            score += 1.0
        checks += 1

        return score / checks if checks > 0 else 0.0

    def _compare_visual_style(self, style_a: Dict, style_b: Dict) -> float:
        """Compare visual style guides."""
        if not style_a or not style_b:
            return 0.0

        score = 0.0
        checks = 0

        # Art style
        if style_a.get("art_style") == style_b.get("art_style"):
            score += 1.0
        checks += 1

        # UI theme
        if style_a.get("ui_theme") == style_b.get("ui_theme"):
            score += 1.0
        checks += 1

        # Audio style
        if style_a.get("audio_style") == style_b.get("audio_style"):
            score += 1.0
        checks += 1

        # Color palette similarity
        palette_a = style_a.get("color_palette", {})
        palette_b = style_b.get("color_palette", {})
        if palette_a and palette_b:
            matching_colors = sum(
                1 for key in palette_a
                if palette_a.get(key) == palette_b.get(key)
            )
            total_colors = max(len(palette_a), len(palette_b), 1)
            score += matching_colors / total_colors
            checks += 1

        return score / checks if checks > 0 else 0.0

    def _compare_difficulty(self, diff_a: Dict, diff_b: Dict) -> float:
        """Compare difficulty curves."""
        if not diff_a or not diff_b:
            return 0.0

        # Compare difficulty factors
        factors_a = set(diff_a.get("factors", []))
        factors_b = set(diff_b.get("factors", []))

        return self._jaccard_similarity(list(factors_a), list(factors_b))

    def _compare_economy(self, econ_a: Dict, econ_b: Dict) -> float:
        """Compare economy settings."""
        if not econ_a or not econ_b:
            return 0.0

        score = 0.0
        checks = 0

        # Currency type
        if econ_a.get("currency") == econ_b.get("currency"):
            score += 1.0
        checks += 1

        # Earn rate (within 20%)
        earn_a = econ_a.get("earn_per_level", 0)
        earn_b = econ_b.get("earn_per_level", 0)
        if earn_a and earn_b:
            ratio = min(earn_a, earn_b) / max(earn_a, earn_b)
            if ratio >= 0.8:
                score += 1.0
        checks += 1

        return score / checks if checks > 0 else 0.0

    def _name_similarity(self, name_a: str, name_b: str) -> float:
        """Simple word-based name similarity."""
        words_a = set(name_a.lower().split())
        words_b = set(name_b.lower().split())

        # Remove common words
        common_words = {"game", "the", "a", "an", "of", "in", "on"}
        words_a -= common_words
        words_b -= common_words

        if not words_a or not words_b:
            return 0.0

        return self._jaccard_similarity(list(words_a), list(words_b))

    async def find_diverse_constraints(
        self,
        genre: str,
        exclude_mechanics: List[str] = None,
        exclude_styles: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate constraints that encourage diversity.
        
        Used when regenerating to avoid similar games.
        """
        exclude_mechanics = exclude_mechanics or []
        exclude_styles = exclude_styles or []

        return {
            "exclude_mechanics": exclude_mechanics,
            "exclude_styles": exclude_styles,
            "prefer_unique": True,
            "diversify_from_genre": genre,
        }
