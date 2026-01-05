"""
Step 4: Analytics Design

Generates the Analytics Event Specification for the game:
- Define all trackable events based on GDD
- Create event schemas with required parameters
- Design analytics funnels
- Store spec in database for implementation reference
"""

import json
from typing import Any, Dict, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.services.ai_service import get_ai_service
from app.services.github_service import get_github_service
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


# Standard GameFactory analytics events
REQUIRED_EVENTS = [
    {
        "name": "game_start",
        "description": "Fired when player starts a game session",
        "parameters": ["session_id", "timestamp"],
    },
    {
        "name": "level_start",
        "description": "Fired when player begins a level",
        "parameters": ["level", "attempt_number"],
    },
    {
        "name": "level_complete",
        "description": "Fired when player completes a level",
        "parameters": ["level", "score", "time_seconds", "stars_earned"],
    },
    {
        "name": "level_fail",
        "description": "Fired when player fails a level",
        "parameters": ["level", "score", "fail_reason", "time_seconds"],
    },
    {
        "name": "unlock_prompt_shown",
        "description": "Fired when ad unlock prompt is displayed",
        "parameters": ["level", "prompt_type"],
    },
    {
        "name": "rewarded_ad_started",
        "description": "Fired when player initiates rewarded ad",
        "parameters": ["level", "ad_placement"],
    },
    {
        "name": "rewarded_ad_completed",
        "description": "Fired when rewarded ad finishes successfully",
        "parameters": ["level", "reward_type", "reward_value"],
    },
    {
        "name": "rewarded_ad_failed",
        "description": "Fired when rewarded ad fails or is cancelled",
        "parameters": ["level", "failure_reason"],
    },
    {
        "name": "level_unlocked",
        "description": "Fired when a new level is unlocked",
        "parameters": ["level", "unlock_method"],
    },
]


class AnalyticsDesignStep(BaseStepExecutor):
    """
    Step 4: Generate Analytics Event Specification.
    
    Creates comprehensive analytics design based on the GDD.
    """

    step_number = 4
    step_name = "analytics_design"

    def __init__(self):
        super().__init__()
        self.ai_service = get_ai_service()
        self.github_service = get_github_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Generate analytics event specification."""
        self.logger.info("designing_analytics", game_id=str(game.id))

        logs = []
        logs.append(f"Starting analytics design for {game.name}")

        try:
            if not game.gdd_spec:
                return {
                    "success": False,
                    "error": "Missing GDD spec from Step 1",
                    "logs": "\n".join(logs),
                }

            if not game.github_repo:
                return {
                    "success": False,
                    "error": "Missing GitHub repo from Step 2",
                    "logs": "\n".join(logs),
                }

            # Generate analytics specification
            logs.append("\n--- Generating Analytics Specification ---")
            
            analytics_spec = await self._generate_analytics_spec(game)
            logs.append(f"Generated {len(analytics_spec['events'])} event definitions")

            # Generate custom events based on genre
            custom_events = await self._generate_custom_events(game)
            analytics_spec["custom_events"] = custom_events
            logs.append(f"Generated {len(custom_events)} custom events for {game.genre}")

            # Generate funnels
            funnels = self._generate_funnels(game)
            analytics_spec["funnels"] = funnels
            logs.append(f"Defined {len(funnels)} analytics funnels")

            # Generate analytics documentation
            logs.append("\n--- Generating Analytics Documentation ---")
            
            analytics_doc = self._generate_analytics_doc(analytics_spec, game)
            
            # Commit to GitHub
            files = {
                "docs/ANALYTICS.md": analytics_doc,
                "lib/config/analytics_events.dart": self._generate_events_dart(analytics_spec),
            }

            commit_result = await self.github_service.create_multiple_files(
                repo_name=game.github_repo,
                files=files,
                commit_message="Step 4: Add analytics event specification",
            )

            if commit_result["success"]:
                logs.append("✓ Analytics documentation committed to GitHub")
            else:
                # Fallback to individual commits
                for path, content in files.items():
                    await self.github_service.create_file(
                        repo_name=game.github_repo,
                        file_path=path,
                        content=content,
                        commit_message=f"Add {path}",
                    )
                logs.append("✓ Analytics files committed individually")

            # Store spec in game record
            if game.gdd_spec:
                game.gdd_spec["analytics_spec"] = analytics_spec
                await db.commit()

            logs.append("\n--- Analytics Design Complete ---")

            validation = await self.validate(db, game, {"analytics_spec": analytics_spec})

            return {
                "success": validation["valid"],
                "artifacts": {
                    "analytics_spec": analytics_spec,
                    "event_count": len(analytics_spec["events"]) + len(custom_events),
                    "funnel_count": len(funnels),
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("analytics_design_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    async def _generate_analytics_spec(self, game: Game) -> Dict[str, Any]:
        """Generate the full analytics specification."""
        return {
            "version": "1.0",
            "game_id": str(game.id),
            "game_name": game.name,
            "events": REQUIRED_EVENTS,
            "global_parameters": {
                "user_id": "Anonymous user identifier",
                "session_id": "Current session identifier",
                "app_version": "App version string",
                "platform": "android/ios",
                "device_model": "Device model name",
            },
            "retention_days": 90,
            "sampling_rate": 1.0,
        }

    async def _generate_custom_events(self, game: Game) -> List[Dict[str, Any]]:
        """Generate genre-specific custom events."""
        genre = game.genre.lower()
        
        custom_events = {
            "platformer": [
                {"name": "jump", "parameters": ["height", "double_jump"]},
                {"name": "enemy_defeated", "parameters": ["enemy_type", "method"]},
                {"name": "checkpoint_reached", "parameters": ["checkpoint_id"]},
            ],
            "runner": [
                {"name": "distance_milestone", "parameters": ["distance", "time"]},
                {"name": "power_up_collected", "parameters": ["power_up_type"]},
                {"name": "near_miss", "parameters": ["obstacle_type"]},
            ],
            "puzzle": [
                {"name": "move_made", "parameters": ["move_type", "position"]},
                {"name": "hint_used", "parameters": ["hint_type", "level"]},
                {"name": "combo_achieved", "parameters": ["combo_size", "points"]},
            ],
            "shooter": [
                {"name": "shot_fired", "parameters": ["weapon_type", "hit"]},
                {"name": "enemy_killed", "parameters": ["enemy_type", "weapon"]},
                {"name": "boss_phase", "parameters": ["boss_id", "phase"]},
            ],
            "casual": [
                {"name": "tap_action", "parameters": ["position", "result"]},
                {"name": "streak_achieved", "parameters": ["streak_count"]},
                {"name": "bonus_earned", "parameters": ["bonus_type", "value"]},
            ],
        }

        return custom_events.get(genre, custom_events["casual"])

    def _generate_funnels(self, game: Game) -> List[Dict[str, Any]]:
        """Generate analytics funnels."""
        return [
            {
                "name": "onboarding",
                "description": "Track user journey from install to first completion",
                "steps": ["game_start", "level_start:1", "level_complete:1", "level_complete:3"],
            },
            {
                "name": "monetization",
                "description": "Track ad monetization funnel",
                "steps": ["level_complete:3", "unlock_prompt_shown", "rewarded_ad_started", "rewarded_ad_completed", "level_unlocked"],
            },
            {
                "name": "retention",
                "description": "Track progression through game",
                "steps": ["level_complete:1", "level_complete:5", "level_complete:10"],
            },
            {
                "name": "engagement",
                "description": "Track daily engagement depth",
                "steps": ["game_start", "level_start", "level_complete"],
            },
        ]

    def _generate_analytics_doc(self, spec: Dict[str, Any], game: Game) -> str:
        """Generate markdown documentation for analytics."""
        doc = f"""# Analytics Event Specification

## Game: {game.name}
## Version: {spec['version']}

## Overview

This document defines all analytics events tracked in the game.
Events are sent to Firebase Analytics and forwarded to the GameFactory backend.

## Global Parameters

All events include these parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
"""
        for param, desc in spec["global_parameters"].items():
            doc += f"| `{param}` | string | {desc} |\n"

        doc += "\n## Required Events\n\n"
        
        for event in spec["events"]:
            doc += f"### `{event['name']}`\n\n"
            doc += f"{event['description']}\n\n"
            doc += "**Parameters:**\n"
            for param in event["parameters"]:
                doc += f"- `{param}`\n"
            doc += "\n"

        doc += "## Custom Events\n\n"
        
        for event in spec.get("custom_events", []):
            doc += f"### `{event['name']}`\n\n"
            doc += "**Parameters:**\n"
            for param in event["parameters"]:
                doc += f"- `{param}`\n"
            doc += "\n"

        doc += "## Funnels\n\n"
        
        for funnel in spec.get("funnels", []):
            doc += f"### {funnel['name']}\n\n"
            doc += f"{funnel['description']}\n\n"
            doc += "**Steps:**\n"
            for i, step in enumerate(funnel["steps"], 1):
                doc += f"{i}. `{step}`\n"
            doc += "\n"

        return doc

    def _generate_events_dart(self, spec: Dict[str, Any]) -> str:
        """Generate Dart constants for analytics events."""
        code = '''/// Analytics event constants
/// 
/// Auto-generated from analytics specification.
/// Do not modify manually.

class AnalyticsEvents {
  AnalyticsEvents._();

  // Required Events
'''
        for event in spec["events"]:
            const_name = event["name"].upper()
            code += f"  static const String {const_name} = '{event['name']}';\n"

        code += "\n  // Custom Events\n"
        for event in spec.get("custom_events", []):
            const_name = event["name"].upper()
            code += f"  static const String {const_name} = '{event['name']}';\n"

        code += """}

class AnalyticsParams {
  AnalyticsParams._();

  // Common parameters
  static const String USER_ID = 'user_id';
  static const String SESSION_ID = 'session_id';
  static const String LEVEL = 'level';
  static const String SCORE = 'score';
  static const String TIME_SECONDS = 'time_seconds';
}
"""
        return code

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate analytics specification."""
        errors = []
        warnings = []

        spec = artifacts.get("analytics_spec", {})

        # Check required events
        event_names = [e["name"] for e in spec.get("events", [])]
        required_names = [e["name"] for e in REQUIRED_EVENTS]
        
        for name in required_names:
            if name not in event_names:
                errors.append(f"Missing required event: {name}")

        # Check funnels
        if not spec.get("funnels"):
            warnings.append("No funnels defined")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback analytics design."""
        if game.gdd_spec and "analytics_spec" in game.gdd_spec:
            del game.gdd_spec["analytics_spec"]
            await db.commit()
        return True
