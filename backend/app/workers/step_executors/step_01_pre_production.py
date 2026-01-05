"""
Step 1: Pre-Production

Generates the Game Design Document (GDD-lite) for each game including:
- Genre specification
- Selected mechanics from Flame examples
- Core loop definition
- Progression system
- Economy design
- Fail states
- Difficulty curve
- Analytics plan
- Asset style guide

IMPORTANT: Includes SIMILARITY CHECK after generation.
If the generated game is >80% similar to any existing game,
the step will regenerate with different constraints until unique.
"""

import json
import random
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.similarity import RegenerationLog, SimilarityCheck
from app.services.mechanic_service import MechanicService
from app.services.similarity_service import (
    MAX_REGENERATION_ATTEMPTS,
    SIMILARITY_THRESHOLD,
    SimilarityService,
)
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


# GDD schema for validation
GDD_SCHEMA = {
    "required_fields": [
        "game_name",
        "genre",
        "mechanics",
        "core_loop",
        "progression",
        "economy",
        "fail_states",
        "difficulty_curve",
        "analytics_plan",
        "asset_style_guide",
    ],
    "mechanics_required": ["primary", "secondary"],
    "analytics_events": [
        "game_start",
        "level_start",
        "level_complete",
        "level_fail",
        "unlock_prompt_shown",
        "rewarded_ad_started",
        "rewarded_ad_completed",
        "rewarded_ad_failed",
        "level_unlocked",
    ],
}

# Art styles for variation
ART_STYLES = [
    "colorful_cartoon",
    "neon_futuristic",
    "clean_minimal",
    "pixel_retro",
    "soft_pastel",
    "dark_gothic",
    "hand_drawn",
    "flat_modern",
    "watercolor",
    "low_poly",
]

# Primary actions for variation
PRIMARY_ACTIONS = {
    "platformer": ["jump", "double_jump", "wall_jump", "dash", "slide"],
    "runner": ["lane_switch", "jump", "slide", "roll", "boost"],
    "puzzle": ["swap_tiles", "rotate", "match", "connect", "slide"],
    "shooter": ["shoot", "aim_shoot", "auto_shoot", "charge_shot", "rapid_fire"],
    "casual": ["tap", "hold", "swipe", "drag", "flick"],
}


class PreProductionStep(BaseStepExecutor):
    """
    Step 1: Generate GDD-lite for the game.
    
    Includes similarity checking to ensure diversity.
    Will regenerate up to MAX_REGENERATION_ATTEMPTS times if too similar.
    """

    step_number = 1
    step_name = "pre_production"

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Generate the game design document with similarity checking."""
        self.logger.info("generating_gdd", game_id=str(game.id), genre=game.genre)

        logs = []
        logs.append(f"Starting pre-production for {game.name}")
        logs.append(f"Similarity threshold: {SIMILARITY_THRESHOLD * 100}%")
        logs.append(f"Max regeneration attempts: {MAX_REGENERATION_ATTEMPTS}")

        attempt = 1
        excluded_mechanics: List[str] = []
        excluded_styles: List[str] = []
        
        # Get constraints from batch if available
        constraints = {}
        if game.batch_id:
            from app.models.batch import Batch
            from sqlalchemy import select
            result = await db.execute(select(Batch).where(Batch.id == game.batch_id))
            batch = result.scalar_one_or_none()
            if batch and batch.constraints:
                constraints = batch.constraints

        similarity_service = SimilarityService(db)
        mechanic_service = MechanicService(db)

        while attempt <= MAX_REGENERATION_ATTEMPTS:
            logs.append(f"\n--- Generation Attempt {attempt} ---")

            try:
                # Get mechanics, excluding any from previous failed attempts
                mechanics = await self._get_diverse_mechanics(
                    mechanic_service,
                    game.genre,
                    excluded_mechanics,
                    constraints,
                )
                mechanic_names = [m.name for m in mechanics] if mechanics else ["default_mechanic"]
                logs.append(f"Selected mechanics: {mechanic_names}")

                # Generate GDD with variation based on attempt
                gdd_spec = self._generate_gdd(
                    game,
                    mechanic_names,
                    attempt,
                    excluded_styles,
                    constraints,
                )
                logs.append("GDD generated")

                # Validate GDD structure
                validation = await self.validate(db, game, {"gdd_spec": gdd_spec})
                if not validation["valid"]:
                    logs.append(f"GDD validation failed: {validation['errors']}")
                    return {
                        "success": False,
                        "artifacts": {"gdd_spec": gdd_spec},
                        "validation": validation,
                        "error": f"GDD validation failed: {validation['errors']}",
                        "logs": "\n".join(logs),
                    }

                # Temporarily update game for similarity check
                game.gdd_spec = gdd_spec
                game.selected_mechanics = mechanic_names

                # SIMILARITY CHECK
                logs.append("Performing similarity check...")
                similarity_result = await similarity_service.check_similarity(game)

                # Record similarity check
                similarity_check = SimilarityCheck(
                    game_id=game.id,
                    is_similar=similarity_result.is_similar,
                    similarity_score=similarity_result.similarity_score,
                    most_similar_game_id=similarity_result.most_similar_game_id,
                    breakdown=similarity_result.breakdown,
                    attempt_number=attempt,
                    triggered_regeneration=similarity_result.is_similar,
                    rejected_gdd=gdd_spec if similarity_result.is_similar else None,
                )
                db.add(similarity_check)

                logs.append(f"Similarity score: {similarity_result.similarity_score:.2%}")
                if similarity_result.breakdown:
                    logs.append(f"Breakdown: {similarity_result.breakdown}")

                if not similarity_result.is_similar:
                    # SUCCESS - Game is unique enough
                    logs.append(f"✓ Game is sufficiently unique (score: {similarity_result.similarity_score:.2%})")
                    
                    await db.commit()

                    return {
                        "success": True,
                        "artifacts": {
                            "gdd_spec": gdd_spec,
                            "selected_mechanics": mechanic_names,
                            "similarity_score": similarity_result.similarity_score,
                            "generation_attempts": attempt,
                        },
                        "validation": validation,
                        "logs": "\n".join(logs),
                    }

                # TOO SIMILAR - Need to regenerate
                logs.append(f"✗ Game is too similar ({similarity_result.similarity_score:.2%} >= {SIMILARITY_THRESHOLD:.0%})")
                
                if similarity_result.most_similar_game_id:
                    logs.append(f"Most similar to game: {similarity_result.most_similar_game_id}")

                # Record regeneration
                regen_log = RegenerationLog(
                    game_id=game.id,
                    batch_id=game.batch_id,
                    attempt_number=attempt,
                    reason="similarity_threshold_exceeded",
                    similarity_score=similarity_result.similarity_score,
                    similar_to_game_id=similarity_result.most_similar_game_id,
                    constraints_applied={
                        "excluded_mechanics": excluded_mechanics,
                        "excluded_styles": excluded_styles,
                    },
                )
                db.add(regen_log)

                # Add current choices to exclusion lists for next attempt
                excluded_mechanics.extend(mechanic_names)
                if gdd_spec.get("asset_style_guide", {}).get("art_style"):
                    excluded_styles.append(gdd_spec["asset_style_guide"]["art_style"])

                logs.append(f"Adding to exclusions - mechanics: {mechanic_names}, style: {gdd_spec.get('asset_style_guide', {}).get('art_style')}")

                attempt += 1

            except Exception as e:
                self.logger.exception("gdd_generation_error", error=str(e))
                logs.append(f"Error in attempt {attempt}: {str(e)}")
                attempt += 1

        # Exhausted all attempts
        logs.append(f"\n✗ FAILED: Could not generate unique game after {MAX_REGENERATION_ATTEMPTS} attempts")
        logs.append("Proceeding with last generated GDD despite similarity")

        # Use the last generated GDD anyway but flag it
        game.gdd_spec["_similarity_warning"] = True
        game.gdd_spec["_similarity_score"] = similarity_result.similarity_score
        await db.commit()

        return {
            "success": True,  # Allow to proceed but with warning
            "artifacts": {
                "gdd_spec": game.gdd_spec,
                "selected_mechanics": game.selected_mechanics,
                "similarity_score": similarity_result.similarity_score,
                "generation_attempts": MAX_REGENERATION_ATTEMPTS,
                "similarity_warning": True,
            },
            "validation": {
                "valid": True,
                "warnings": [
                    f"Game may be similar to existing games (score: {similarity_result.similarity_score:.2%})",
                    f"Could not achieve uniqueness after {MAX_REGENERATION_ATTEMPTS} attempts",
                ],
            },
            "logs": "\n".join(logs),
        }

    async def _get_diverse_mechanics(
        self,
        mechanic_service: MechanicService,
        genre: str,
        excluded: List[str],
        constraints: Dict,
    ) -> List:
        """Get mechanics ensuring diversity from excluded list."""
        # First try recommended mechanics
        mechanics = await mechanic_service.recommend_mechanics(genre, count=5)

        # Filter out excluded mechanics
        mechanics = [m for m in mechanics if m.name not in excluded]

        if len(mechanics) >= 3:
            return mechanics[:3]

        # Need more mechanics - get from broader pool
        all_mechanics = await mechanic_service.list_mechanics(
            genre=genre,
            limit=20,
        )
        all_mechanics = [m for m in all_mechanics if m.name not in excluded]

        # Combine and return top 3
        combined = mechanics + [m for m in all_mechanics if m not in mechanics]
        return combined[:3] if combined else []

    def _generate_gdd(
        self,
        game: Game,
        mechanics: List[str],
        attempt: int,
        excluded_styles: List[str],
        constraints: Dict,
    ) -> Dict[str, Any]:
        """Generate the GDD structure with variation based on attempt."""
        genre = game.genre.lower()

        # Get available art styles (excluding used ones)
        available_styles = [s for s in ART_STYLES if s not in excluded_styles]
        if not available_styles:
            available_styles = ART_STYLES  # Reset if all used

        # Select art style - vary based on attempt
        art_style_index = (attempt - 1) % len(available_styles)
        art_style = available_styles[art_style_index]

        # Get primary action - vary based on attempt
        genre_actions = PRIMARY_ACTIONS.get(genre, PRIMARY_ACTIONS["casual"])
        action_index = (attempt - 1) % len(genre_actions)
        primary_action = genre_actions[action_index]

        # Genre-specific templates with variation
        genre_configs = {
            "platformer": {
                "core_loop": f"Jump, avoid obstacles, reach goal using {primary_action}",
                "primary_action": primary_action,
                "fail_condition": "fall or hit enemy",
                "difficulty_factors": ["platform_spacing", "enemy_count", "time_limit"],
            },
            "runner": {
                "core_loop": f"Run, dodge obstacles using {primary_action}, collect coins",
                "primary_action": primary_action,
                "fail_condition": "hit obstacle",
                "difficulty_factors": ["speed", "obstacle_density", "lane_changes"],
            },
            "puzzle": {
                "core_loop": f"Solve puzzles using {primary_action}, clear board, score points",
                "primary_action": primary_action,
                "fail_condition": "no_moves_remaining",
                "difficulty_factors": ["grid_size", "tile_types", "move_limit"],
            },
            "shooter": {
                "core_loop": f"Use {primary_action}, defeat enemies, survive waves",
                "primary_action": primary_action,
                "fail_condition": "health_depleted",
                "difficulty_factors": ["enemy_count", "enemy_speed", "enemy_types"],
            },
            "casual": {
                "core_loop": f"Use {primary_action} to interact, complete objectives",
                "primary_action": primary_action,
                "fail_condition": "timer_expired",
                "difficulty_factors": ["target_count", "time_limit", "precision"],
            },
        }

        config = genre_configs.get(genre, genre_configs["casual"])

        # Vary session length based on attempt
        base_session_length = 180
        session_length = base_session_length + (attempt - 1) * 30  # 180, 210, 240, ...

        # Vary economy based on attempt
        base_earn = 10
        earn_per_level = base_earn + (attempt - 1) * 5  # 10, 15, 20, ...

        return {
            "game_name": game.name,
            "genre": game.genre,
            "generation_attempt": attempt,
            "mechanics": {
                "primary": mechanics[0] if mechanics else "tap_to_action",
                "secondary": mechanics[1] if len(mechanics) > 1 else None,
                "tertiary": mechanics[2] if len(mechanics) > 2 else None,
            },
            "core_loop": {
                "description": config["core_loop"],
                "primary_action": config["primary_action"],
                "reward_trigger": "level_complete",
                "session_length_target_seconds": session_length,
            },
            "progression": {
                "level_count": 10,
                "free_levels": [1, 2, 3],
                "locked_levels": [4, 5, 6, 7, 8, 9, 10],
                "unlock_mechanism": "rewarded_ad",
                "difficulty_ramp": "linear",
            },
            "economy": {
                "currency": "coins",
                "earn_per_level": earn_per_level,
                "ad_reward_multiplier": 2,
                "no_iap": True,
            },
            "fail_states": {
                "primary": config["fail_condition"],
                "retry_cost": "watch_ad_optional",
                "game_over_trigger": "3_consecutive_fails",
            },
            "difficulty_curve": {
                "factors": config["difficulty_factors"],
                "level_1": {"difficulty": 1, "description": "Tutorial"},
                "level_3": {"difficulty": 3, "description": "Comfortable"},
                "level_5": {"difficulty": 5, "description": "Challenging"},
                "level_7": {"difficulty": 7, "description": "Hard"},
                "level_10": {"difficulty": 10, "description": "Expert"},
            },
            "analytics_plan": {
                "events": GDD_SCHEMA["analytics_events"],
                "custom_properties": {
                    "level_start": ["level_number", "retry_count"],
                    "level_complete": ["level_number", "score", "time_seconds"],
                    "level_fail": ["level_number", "fail_reason", "progress_percent"],
                },
                "retention_tracking": True,
                "funnel_stages": ["install", "tutorial", "level_3", "first_ad", "level_10"],
            },
            "asset_style_guide": {
                "art_style": art_style,
                "color_palette": self._get_color_palette(art_style),
                "ui_theme": "modern_minimal",
                "audio_style": "upbeat_casual",
            },
        }

    def _get_color_palette(self, art_style: str) -> Dict[str, str]:
        """Get color palette for art style."""
        palettes = {
            "colorful_cartoon": {
                "primary": "#4CAF50",
                "secondary": "#2196F3",
                "accent": "#FF9800",
                "background": "#E8F5E9",
                "text": "#212121",
            },
            "neon_futuristic": {
                "primary": "#00E5FF",
                "secondary": "#FF00FF",
                "accent": "#76FF03",
                "background": "#0D0D0D",
                "text": "#FFFFFF",
            },
            "clean_minimal": {
                "primary": "#3F51B5",
                "secondary": "#9C27B0",
                "accent": "#00BCD4",
                "background": "#FAFAFA",
                "text": "#37474F",
            },
            "pixel_retro": {
                "primary": "#E91E63",
                "secondary": "#9C27B0",
                "accent": "#FFEB3B",
                "background": "#1A1A2E",
                "text": "#EAEAEA",
            },
            "soft_pastel": {
                "primary": "#F48FB1",
                "secondary": "#CE93D8",
                "accent": "#80DEEA",
                "background": "#FFF8E1",
                "text": "#5D4037",
            },
            "dark_gothic": {
                "primary": "#B71C1C",
                "secondary": "#4A148C",
                "accent": "#FFD600",
                "background": "#121212",
                "text": "#E0E0E0",
            },
            "hand_drawn": {
                "primary": "#795548",
                "secondary": "#607D8B",
                "accent": "#FF5722",
                "background": "#FFF3E0",
                "text": "#3E2723",
            },
            "flat_modern": {
                "primary": "#1976D2",
                "secondary": "#388E3C",
                "accent": "#FBC02D",
                "background": "#ECEFF1",
                "text": "#263238",
            },
            "watercolor": {
                "primary": "#81D4FA",
                "secondary": "#A5D6A7",
                "accent": "#FFCC80",
                "background": "#FFFDE7",
                "text": "#455A64",
            },
            "low_poly": {
                "primary": "#26A69A",
                "secondary": "#5C6BC0",
                "accent": "#EF5350",
                "background": "#FAFAFA",
                "text": "#37474F",
            },
        }
        return palettes.get(art_style, palettes["clean_minimal"])

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate the GDD against schema."""
        gdd = artifacts.get("gdd_spec", {})
        errors = []
        warnings = []

        # Check required fields
        for field in GDD_SCHEMA["required_fields"]:
            if field not in gdd:
                errors.append(f"Missing required field: {field}")

        # Check mechanics
        mechanics = gdd.get("mechanics", {})
        if not mechanics.get("primary"):
            errors.append("Missing primary mechanic")

        # Check analytics events
        analytics = gdd.get("analytics_plan", {})
        events = analytics.get("events", [])
        for required_event in GDD_SCHEMA["analytics_events"]:
            if required_event not in events:
                warnings.append(f"Missing analytics event: {required_event}")

        # Check progression
        progression = gdd.get("progression", {})
        if progression.get("level_count", 0) != 10:
            warnings.append("Level count should be 10")

        free_levels = progression.get("free_levels", [])
        if free_levels != [1, 2, 3]:
            warnings.append("Free levels should be [1, 2, 3]")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }
