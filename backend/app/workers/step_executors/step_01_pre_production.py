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
"""

import json
from typing import Any, Dict, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.services.mechanic_service import MechanicService
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


class PreProductionStep(BaseStepExecutor):
    """Step 1: Generate GDD-lite for the game."""

    step_number = 1
    step_name = "pre_production"

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Generate the game design document."""
        self.logger.info("generating_gdd", game_id=str(game.id), genre=game.genre)

        logs = []
        logs.append(f"Starting pre-production for {game.name}")

        try:
            # Get recommended mechanics for the genre
            mechanic_service = MechanicService(db)
            mechanics = await mechanic_service.recommend_mechanics(game.genre, count=3)

            if not mechanics:
                # Fall back to default mechanics
                mechanics = await mechanic_service.list_mechanics(
                    genre=game.genre,
                    limit=3,
                )

            mechanic_names = [m.name for m in mechanics] if mechanics else ["default_mechanic"]
            logs.append(f"Selected mechanics: {mechanic_names}")

            # Generate GDD
            gdd_spec = self._generate_gdd(game, mechanic_names)
            logs.append("GDD generated successfully")

            # Validate GDD
            validation = await self.validate(db, game, {"gdd_spec": gdd_spec})

            if not validation["valid"]:
                return {
                    "success": False,
                    "artifacts": {"gdd_spec": gdd_spec},
                    "validation": validation,
                    "error": f"GDD validation failed: {validation['errors']}",
                    "logs": "\n".join(logs),
                }

            # Update game with GDD
            game.gdd_spec = gdd_spec
            game.selected_mechanics = mechanic_names
            await db.commit()

            logs.append("Game updated with GDD spec")

            return {
                "success": True,
                "artifacts": {
                    "gdd_spec": gdd_spec,
                    "selected_mechanics": mechanic_names,
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("gdd_generation_failed", error=str(e))
            logs.append(f"Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    def _generate_gdd(self, game: Game, mechanics: List[str]) -> Dict[str, Any]:
        """Generate the GDD structure."""
        genre = game.genre.lower()

        # Genre-specific templates
        genre_configs = {
            "platformer": {
                "core_loop": "Jump, avoid obstacles, reach goal",
                "primary_action": "jump",
                "fail_condition": "fall or hit enemy",
                "difficulty_factors": ["platform_spacing", "enemy_count", "time_limit"],
                "art_style": "colorful_cartoon",
            },
            "runner": {
                "core_loop": "Run, dodge obstacles, collect coins",
                "primary_action": "lane_switch",
                "fail_condition": "hit obstacle",
                "difficulty_factors": ["speed", "obstacle_density", "lane_changes"],
                "art_style": "neon_futuristic",
            },
            "puzzle": {
                "core_loop": "Match patterns, clear board, score points",
                "primary_action": "swap_tiles",
                "fail_condition": "no_moves_remaining",
                "difficulty_factors": ["grid_size", "tile_types", "move_limit"],
                "art_style": "clean_minimal",
            },
            "shooter": {
                "core_loop": "Aim, shoot enemies, survive waves",
                "primary_action": "shoot",
                "fail_condition": "health_depleted",
                "difficulty_factors": ["enemy_count", "enemy_speed", "enemy_types"],
                "art_style": "pixel_retro",
            },
            "casual": {
                "core_loop": "Tap to interact, complete objectives",
                "primary_action": "tap",
                "fail_condition": "timer_expired",
                "difficulty_factors": ["target_count", "time_limit", "precision"],
                "art_style": "soft_pastel",
            },
        }

        config = genre_configs.get(genre, genre_configs["casual"])

        return {
            "game_name": game.name,
            "genre": game.genre,
            "mechanics": {
                "primary": mechanics[0] if mechanics else "tap_to_action",
                "secondary": mechanics[1] if len(mechanics) > 1 else None,
                "tertiary": mechanics[2] if len(mechanics) > 2 else None,
            },
            "core_loop": {
                "description": config["core_loop"],
                "primary_action": config["primary_action"],
                "reward_trigger": "level_complete",
                "session_length_target_seconds": 180,
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
                "earn_per_level": 10,
                "ad_reward_multiplier": 2,
                "no_iap": True,  # Revenue from ads only
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
                "art_style": config["art_style"],
                "color_palette": self._get_color_palette(config["art_style"]),
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
