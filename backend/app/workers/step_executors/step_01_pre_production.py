"""
Step 1: Pre-Production

Generates the Game Design Document (GDD-lite) for each game using AI:
- Genre specification
- Selected mechanics from Flame examples
- Core loop definition
- Progression system
- Economy design
- Fail states
- Difficulty curve
- Analytics plan
- Asset style guide

IMPORTANT: This step REQUIRES AI for GDD generation. The system will:
1. Validate AI service availability before starting
2. Use retry mechanism for transient API failures
3. Only fall back to templates if AI_ALLOW_TEMPLATE_FALLBACK=true (dev only)

IMPORTANT: Includes SIMILARITY CHECK after generation.
If the generated game is >80% similar to any existing game,
the step will regenerate with different constraints until unique.
"""

from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.game import Game
from app.models.similarity import RegenerationLog, SimilarityCheck
from app.services.ai_service import (
    AIGenerationError,
    AIServiceNotConfiguredError,
    get_ai_service,
)
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


class PreProductionStep(BaseStepExecutor):
    """
    Step 1: Generate GDD-lite for the game using AI.
    
    IMPORTANT: This step REQUIRES AI (Claude or OpenAI) for GDD generation.
    Template fallback is only available if AI_ALLOW_TEMPLATE_FALLBACK=true.
    
    Uses Claude (primary) or OpenAI (fallback) to generate comprehensive
    game design documents. Includes similarity checking to ensure diversity.
    Will regenerate up to MAX_REGENERATION_ATTEMPTS times if too similar.
    """

    step_number = 1
    step_name = "pre_production"

    def __init__(self):
        super().__init__()
        self.ai_service = get_ai_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Generate the game design document with AI and similarity checking."""
        self.logger.info("generating_gdd", game_id=str(game.id), genre=game.genre)

        logs = []
        logs.append(f"Starting pre-production for {game.name}")
        
        # Log AI provider info
        ai_info = self.ai_service.get_provider_info()
        logs.append(f"AI Provider: Claude={ai_info['claude_configured']}, OpenAI={ai_info['openai_configured']}")
        logs.append(f"AI Required: {ai_info['ai_required']}, Template Fallback Allowed: {ai_info['fallback_allowed']}")
        logs.append(f"Similarity threshold: {SIMILARITY_THRESHOLD * 100}%")
        logs.append(f"Max regeneration attempts: {MAX_REGENERATION_ATTEMPTS}")
        
        # Validate AI availability upfront (fail fast if required but not configured)
        try:
            self.ai_service.validate_availability()
            logs.append("✓ AI service validated and ready")
        except AIServiceNotConfiguredError as e:
            logs.append(f"✗ AI service not configured: {str(e)}")
            return {
                "success": False,
                "artifacts": {},
                "validation": {"valid": False, "errors": [str(e)]},
                "error": str(e),
                "logs": "\n".join(logs),
            }

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

        # Initialize variables to track last successful generation
        last_gdd_spec = None
        last_mechanic_names: List[str] = []
        last_similarity_result = None

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
                mechanic_names = [m.name for m in mechanics] if mechanics else ["tap_jump", "collision_detection"]
                logs.append(f"Selected mechanics: {mechanic_names}")

                # Generate GDD using AI service (REQUIRED)
                logs.append("Calling AI service for GDD generation...")
                try:
                    gdd_spec = await self.ai_service.generate_gdd(
                        game_name=game.name,
                        genre=game.genre,
                        mechanics=mechanic_names,
                        constraints=constraints,
                        excluded_styles=excluded_styles,
                        attempt_number=attempt,
                    )
                    logs.append(f"✓ GDD generated successfully via AI (provider: {gdd_spec.get('_ai_provider', 'unknown')})")
                except AIServiceNotConfiguredError as config_error:
                    # AI is required but not configured - check if fallback allowed
                    if settings.ai_allow_template_fallback:
                        logs.append(f"⚠ AI not configured, using template fallback (dev mode): {str(config_error)}")
                        gdd_spec = self._generate_fallback_gdd(
                            game,
                            mechanic_names,
                            attempt,
                            excluded_styles,
                        )
                        gdd_spec["_generated_by"] = "template_fallback"
                        gdd_spec["_fallback_reason"] = str(config_error)
                    else:
                        # Fail - AI is required
                        logs.append(f"✗ AI REQUIRED but not configured: {str(config_error)}")
                        return {
                            "success": False,
                            "artifacts": {},
                            "validation": {"valid": False, "errors": [str(config_error)]},
                            "error": f"AI service required for GDD generation: {str(config_error)}",
                            "logs": "\n".join(logs),
                        }
                except AIGenerationError as gen_error:
                    # AI is configured but generation failed after retries
                    if settings.ai_allow_template_fallback:
                        logs.append(f"⚠ AI generation failed after retries, using template fallback: {str(gen_error)}")
                        gdd_spec = self._generate_fallback_gdd(
                            game,
                            mechanic_names,
                            attempt,
                            excluded_styles,
                        )
                        gdd_spec["_generated_by"] = "template_fallback"
                        gdd_spec["_fallback_reason"] = str(gen_error)
                    else:
                        # Fail - AI generation failed and fallback not allowed
                        logs.append(f"✗ AI generation failed: {str(gen_error)}")
                        return {
                            "success": False,
                            "artifacts": {},
                            "validation": {"valid": False, "errors": [str(gen_error)]},
                            "error": f"AI generation failed: {str(gen_error)}",
                            "logs": "\n".join(logs),
                        }
                except Exception as ai_error:
                    # Unexpected error - apply same fallback logic
                    if settings.ai_allow_template_fallback:
                        logs.append(f"⚠ Unexpected AI error, using template fallback: {str(ai_error)}")
                        gdd_spec = self._generate_fallback_gdd(
                            game,
                            mechanic_names,
                            attempt,
                            excluded_styles,
                        )
                        gdd_spec["_generated_by"] = "template_fallback"
                        gdd_spec["_fallback_reason"] = str(ai_error)
                    else:
                        logs.append(f"✗ Unexpected AI error: {str(ai_error)}")
                        return {
                            "success": False,
                            "artifacts": {},
                            "validation": {"valid": False, "errors": [str(ai_error)]},
                            "error": f"AI generation error: {str(ai_error)}",
                            "logs": "\n".join(logs),
                        }

                # Validate GDD structure
                validation = await self.validate(db, game, {"gdd_spec": gdd_spec})
                if not validation["valid"]:
                    logs.append(f"GDD validation failed: {validation['errors']}")
                    # Try to fix common issues
                    gdd_spec = self._fix_gdd_issues(gdd_spec, validation["errors"])
                    validation = await self.validate(db, game, {"gdd_spec": gdd_spec})
                    
                    if not validation["valid"]:
                        return {
                            "success": False,
                            "artifacts": {"gdd_spec": gdd_spec},
                            "validation": validation,
                            "error": f"GDD validation failed: {validation['errors']}",
                            "logs": "\n".join(logs),
                        }

                logs.append("GDD validation passed")

                # Temporarily update game for similarity check
                game.gdd_spec = gdd_spec
                game.selected_mechanics = mechanic_names

                # SIMILARITY CHECK
                logs.append("Performing similarity check...")
                similarity_result = await similarity_service.check_similarity(game)
                
                # Save for potential fallback
                last_gdd_spec = gdd_spec
                last_mechanic_names = mechanic_names
                last_similarity_result = similarity_result

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

        # All attempts exhausted - use last generated GDD with warning
        logs.append(f"\n--- All {MAX_REGENERATION_ATTEMPTS} attempts exhausted ---")

        if last_gdd_spec is None:
            return {
                "success": False,
                "artifacts": {},
                "validation": {"valid": False, "errors": ["No GDD generated after all attempts"]},
                "error": "Failed to generate any valid GDD",
                "logs": "\n".join(logs),
            }

        logs.append("Proceeding with last generated GDD despite similarity")

        # Use the last generated GDD anyway but flag it
        last_gdd_spec["_similarity_warning"] = True
        if last_similarity_result:
            last_gdd_spec["_similarity_score"] = last_similarity_result.similarity_score
        
        game.gdd_spec = last_gdd_spec
        game.selected_mechanics = last_mechanic_names
        await db.commit()

        similarity_score = last_similarity_result.similarity_score if last_similarity_result else 0.0

        return {
            "success": True,  # Allow to proceed but with warning
            "artifacts": {
                "gdd_spec": last_gdd_spec,
                "selected_mechanics": last_mechanic_names,
                "similarity_score": similarity_score,
                "generation_attempts": MAX_REGENERATION_ATTEMPTS,
                "similarity_warning": True,
            },
            "validation": {
                "valid": True,
                "warnings": [
                    f"Game may be similar to existing games (score: {similarity_score:.2%})",
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

    def _generate_fallback_gdd(
        self,
        game: Game,
        mechanics: List[str],
        attempt: int,
        excluded_styles: List[str],
    ) -> Dict[str, Any]:
        """
        Generate a fallback GDD when AI service is unavailable.
        Uses template-based generation with variation.
        
        WARNING: This should only be used for development/testing.
        Production systems should ALWAYS use AI-generated GDDs.
        Enable with AI_ALLOW_TEMPLATE_FALLBACK=true environment variable.
        """
        self.logger.warning(
            "using_template_fallback_gdd",
            game_id=str(game.id),
            reason="AI unavailable or failed",
            warning="Template fallback should only be used for development",
        )
        genre = game.genre.lower()

        # Get available art styles (excluding used ones)
        available_styles = [s for s in ART_STYLES if s not in excluded_styles]
        if not available_styles:
            available_styles = ART_STYLES  # Reset if all used

        # Select art style - vary based on attempt
        art_style_index = (attempt - 1) % len(available_styles)
        art_style = available_styles[art_style_index]

        # Genre-specific configurations
        genre_configs = {
            "platformer": {
                "core_loop": "Jump between platforms, avoid obstacles, reach goal",
                "primary_action": "tap",
                "fail_condition": "fall or hit enemy",
                "difficulty_factors": ["platform_spacing", "enemy_count", "time_limit"],
            },
            "runner": {
                "core_loop": "Run automatically, dodge obstacles, collect coins",
                "primary_action": "swipe",
                "fail_condition": "hit obstacle",
                "difficulty_factors": ["speed", "obstacle_frequency", "gap_size"],
            },
            "puzzle": {
                "core_loop": "Match or arrange elements to clear board",
                "primary_action": "tap",
                "fail_condition": "no more moves or time up",
                "difficulty_factors": ["grid_size", "move_limit", "target_score"],
            },
            "shooter": {
                "core_loop": "Shoot enemies, avoid bullets, survive waves",
                "primary_action": "tap",
                "fail_condition": "lose all health",
                "difficulty_factors": ["enemy_count", "bullet_speed", "boss_health"],
            },
            "casual": {
                "core_loop": "Simple tap to interact, achieve high score",
                "primary_action": "tap",
                "fail_condition": "miss timing or wrong tap",
                "difficulty_factors": ["speed", "precision", "combo_requirement"],
            },
        }

        config = genre_configs.get(genre, genre_configs["casual"])

        return {
            "game_name": game.name,
            "genre": game.genre,
            "tagline": f"An exciting {genre} adventure!",
            "mechanics": {
                "primary": mechanics[0] if mechanics else "tap_jump",
                "secondary": mechanics[1:] if len(mechanics) > 1 else ["collision_detection"],
                "selected_from_library": mechanics,
            },
            "core_loop": {
                "description": config["core_loop"],
                "session_length_seconds": 90 + (attempt * 15),
                "primary_action": config["primary_action"],
                "reward_cycle": "Complete level to earn stars and coins",
            },
            "progression": {
                "level_count": 10,
                "free_levels": [1, 2, 3],
                "locked_levels": [4, 5, 6, 7, 8, 9, 10],
                "unlock_method": "rewarded_ad",
                "difficulty_increase_per_level": "10% harder each level",
            },
            "economy": {
                "primary_currency": "coins",
                "earn_rate_per_level": 50 + (attempt * 10),
                "uses": ["cosmetics", "power_ups", "continues"],
            },
            "fail_states": {
                "conditions": [config["fail_condition"]],
                "consequence": "restart level",
                "retry_cost": "free",
            },
            "difficulty_curve": {
                "level_1": {"description": "Tutorial - very easy", "target_completion_rate": 0.95},
                "level_5": {"description": "Medium challenge", "target_completion_rate": 0.70},
                "level_10": {"description": "Expert difficulty", "target_completion_rate": 0.40},
                "scaling_factors": config["difficulty_factors"],
            },
            "analytics_plan": {
                "key_events": GDD_SCHEMA["analytics_events"],
                "key_metrics": ["retention", "completion_rate", "ad_opt_in_rate"],
                "funnel_stages": ["install", "tutorial", "level_3", "first_ad", "level_10"],
            },
            "asset_style_guide": {
                "art_style": art_style,
                "color_palette": self._get_color_palette(art_style),
                "character_style": f"Cute {art_style} characters",
                "environment_style": f"{art_style} themed backgrounds",
                "ui_style": f"Clean {art_style} UI elements",
                "audio_style": "upbeat" if genre in ["casual", "puzzle"] else "energetic",
            },
            "technical_requirements": {
                "target_fps": 60,
                "min_android_sdk": 21,
                "orientation": "portrait",
                "offline_capable": True,
            },
        }

    def _get_color_palette(self, art_style: str) -> List[str]:
        """Get color palette based on art style."""
        palettes = {
            "colorful_cartoon": ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
            "neon_futuristic": ["#00F5FF", "#FF00FF", "#00FF00", "#FF0080", "#8000FF"],
            "clean_minimal": ["#2D3436", "#636E72", "#B2BEC3", "#DFE6E9", "#FFFFFF"],
            "pixel_retro": ["#E74C3C", "#3498DB", "#2ECC71", "#F1C40F", "#9B59B6"],
            "soft_pastel": ["#FFB5B5", "#B5D8FF", "#B5FFB5", "#FFE5B5", "#E5B5FF"],
            "dark_gothic": ["#2C0A37", "#4A0E4E", "#7B1E7A", "#A51C6C", "#D6336C"],
            "hand_drawn": ["#5D4037", "#795548", "#8D6E63", "#A1887F", "#BCAAA4"],
            "flat_modern": ["#1ABC9C", "#3498DB", "#9B59B6", "#E74C3C", "#F39C12"],
            "watercolor": ["#E8D5B7", "#B8D4E3", "#F2D7EE", "#C9E4CA", "#FFE6CC"],
            "low_poly": ["#16A085", "#27AE60", "#2980B9", "#8E44AD", "#F39C12"],
        }
        return palettes.get(art_style, palettes["colorful_cartoon"])

    def _fix_gdd_issues(
        self,
        gdd: Dict[str, Any],
        errors: List[str],
    ) -> Dict[str, Any]:
        """Attempt to fix common GDD validation issues."""
        fixed_gdd = gdd.copy()
        
        for error in errors:
            if "game_name" in error.lower():
                fixed_gdd["game_name"] = fixed_gdd.get("game_name", "Untitled Game")
            if "genre" in error.lower():
                fixed_gdd["genre"] = fixed_gdd.get("genre", "casual")
            if "mechanics" in error.lower():
                if "mechanics" not in fixed_gdd:
                    fixed_gdd["mechanics"] = {}
                if "primary" not in fixed_gdd["mechanics"]:
                    fixed_gdd["mechanics"]["primary"] = "tap_jump"
                if "secondary" not in fixed_gdd["mechanics"]:
                    fixed_gdd["mechanics"]["secondary"] = ["collision_detection"]
            if "analytics_plan" in error.lower():
                fixed_gdd["analytics_plan"] = {
                    "key_events": GDD_SCHEMA["analytics_events"],
                    "key_metrics": ["retention", "completion_rate"],
                    "funnel_stages": ["install", "tutorial", "level_10"],
                }
            if "asset_style_guide" in error.lower():
                fixed_gdd["asset_style_guide"] = {
                    "art_style": "colorful_cartoon",
                    "color_palette": ["#FF6B6B", "#4ECDC4", "#45B7D1"],
                    "audio_style": "upbeat",
                }

        return fixed_gdd

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate the generated GDD against schema."""
        errors = []
        warnings = []

        gdd = artifacts.get("gdd_spec", {})

        # Check required fields
        for field in GDD_SCHEMA["required_fields"]:
            if field not in gdd:
                errors.append(f"Missing required field: {field}")

        # Check mechanics structure
        mechanics = gdd.get("mechanics", {})
        for req_field in GDD_SCHEMA["mechanics_required"]:
            if req_field not in mechanics:
                errors.append(f"Missing mechanics field: {req_field}")

        # Check analytics events
        analytics_plan = gdd.get("analytics_plan", {})
        defined_events = analytics_plan.get("key_events", [])
        for event in GDD_SCHEMA["analytics_events"]:
            if event not in defined_events:
                warnings.append(f"Missing analytics event: {event}")

        # Check progression
        progression = gdd.get("progression", {})
        if progression.get("level_count", 0) != 10:
            warnings.append("Level count should be 10")

        free_levels = progression.get("free_levels", [])
        if len(free_levels) != 3:
            warnings.append("Should have exactly 3 free levels")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback the pre-production step."""
        game.gdd_spec = None
        game.selected_mechanics = None
        await db.commit()
        return True
