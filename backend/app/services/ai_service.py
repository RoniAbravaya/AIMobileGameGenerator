"""
AI Service - Claude AI Primary

Provides AI-powered generation capabilities using Anthropic Claude as the primary provider.
Supports OpenAI as a fallback option.

Handles:
- GDD generation
- Code generation  
- Level configuration
- Asset prompt generation
- Code quality analysis
"""

import json
from typing import Any, Dict, List, Optional

import structlog
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings

logger = structlog.get_logger()


# Claude model options
CLAUDE_MODELS = {
    "claude-3-opus": "claude-3-opus-20240229",         # Most capable, best for complex tasks
    "claude-3-5-sonnet": "claude-3-5-sonnet-20241022", # Balanced, recommended default
    "claude-3-sonnet": "claude-3-sonnet-20240229",     # Previous sonnet
    "claude-3-haiku": "claude-3-haiku-20240307",       # Fastest, good for simple tasks
}


class AIService:
    """
    Service for AI-powered content generation.
    
    Primary: Anthropic Claude (claude-3-5-sonnet by default)
    Fallback: OpenAI GPT-4 (if configured)
    """

    def __init__(self):
        self.anthropic_client: Optional[AsyncAnthropic] = None
        self.openai_client: Optional[AsyncOpenAI] = None
        # Use model from settings, or default to claude-3-5-sonnet
        self.primary_model: str = getattr(settings, 'claude_model', None) or "claude-3-5-sonnet-20241022"
        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize AI clients - Claude primary, OpenAI fallback."""
        # Primary: Anthropic Claude
        if settings.anthropic_api_key:
            self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
            logger.info("claude_client_initialized", model=self.primary_model)
        
        # Fallback: OpenAI
        if settings.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            logger.info("openai_client_initialized_as_fallback")

        if not self.anthropic_client and not self.openai_client:
            logger.warning(
                "no_ai_clients_available", 
                message="Set ANTHROPIC_API_KEY (primary) or OPENAI_API_KEY (fallback)"
            )

    def set_model(self, model_name: str):
        """
        Set the Claude model to use.
        
        Args:
            model_name: One of 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'
        """
        if model_name in CLAUDE_MODELS:
            self.primary_model = CLAUDE_MODELS[model_name]
            logger.info("claude_model_changed", model=self.primary_model)
        else:
            logger.warning("invalid_model_name", model=model_name, available=list(CLAUDE_MODELS.keys()))

    async def _call_claude(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """
        Call Claude API.
        
        Args:
            system_prompt: System instructions for Claude
            user_prompt: User message/request
            model: Optional model override
            temperature: Creativity level (0.0-1.0)
            max_tokens: Maximum response length
        """
        if not self.anthropic_client:
            raise ValueError("Claude client not initialized. Set ANTHROPIC_API_KEY.")

        model = model or self.primary_model

        logger.debug("calling_claude", model=model, max_tokens=max_tokens)

        response = await self.anthropic_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        
        return response.content[0].text

    async def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Call OpenAI API (fallback)."""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized. Set OPENAI_API_KEY.")

        model = model or settings.ai_model or "gpt-4-turbo-preview"
        
        response = await self.openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        return response.choices[0].message.content

    async def _call_ai(
        self,
        system_prompt: str,
        user_prompt: str,
        use_fallback_on_error: bool = True,
        **kwargs,
    ) -> str:
        """
        Call AI with Claude as primary, OpenAI as fallback.
        
        Args:
            system_prompt: System instructions
            user_prompt: User request
            use_fallback_on_error: Whether to try OpenAI if Claude fails
            **kwargs: Additional arguments (temperature, max_tokens, etc.)
        """
        # Try Claude first (primary)
        if self.anthropic_client:
            try:
                return await self._call_claude(system_prompt, user_prompt, **kwargs)
            except Exception as e:
                logger.warning("claude_call_failed", error=str(e))
                if use_fallback_on_error and self.openai_client:
                    logger.info("falling_back_to_openai")
                    return await self._call_openai(system_prompt, user_prompt, **kwargs)
                raise
        
        # Fallback to OpenAI if no Claude
        if self.openai_client:
            logger.info("using_openai_no_claude_configured")
            return await self._call_openai(system_prompt, user_prompt, **kwargs)
        
        raise ValueError("No AI client available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.")

    async def generate_gdd(
        self,
        game_name: str,
        genre: str,
        mechanics: List[str],
        constraints: Optional[Dict] = None,
        excluded_styles: Optional[List[str]] = None,
        attempt_number: int = 1,
    ) -> Dict[str, Any]:
        """
        Generate a Game Design Document (GDD-lite) for a mobile game.
        
        Uses Claude's structured output capabilities for reliable JSON generation.
        
        Args:
            game_name: Name of the game
            genre: Game genre (platformer, runner, puzzle, etc.)
            mechanics: List of selected mechanics from the library
            constraints: Optional constraints from batch or learning loop
            excluded_styles: Art styles to avoid (for diversity)
            attempt_number: Current generation attempt (for variation)
        
        Returns:
            Complete GDD specification as a dictionary
        """
        excluded_styles = excluded_styles or []
        constraints = constraints or {}

        system_prompt = """You are a professional mobile game designer specializing in Flutter + Flame games.
Your task is to create detailed Game Design Documents (GDD-lite) for casual mobile games.

IMPORTANT RULES:
1. Games must be suitable for mobile (portrait orientation, touch controls)
2. Games must support 10 levels with increasing difficulty
3. Levels 1-3 are free, levels 4-10 unlock via rewarded ads
4. All games need clear win/lose conditions
5. Design for short play sessions (1-3 minutes per level)
6. Include monetization hooks (rewarded ads for unlocks)

You MUST return a valid JSON object with no additional text, markdown, or code blocks.
Start your response directly with { and end with }."""

        user_prompt = f"""Create a GDD-lite for the following game:

GAME NAME: {game_name}
GENRE: {genre}
SELECTED MECHANICS: {', '.join(mechanics)}
GENERATION ATTEMPT: {attempt_number} (vary the design significantly if attempt > 1)

CONSTRAINTS FROM SYSTEM:
{json.dumps(constraints, indent=2) if constraints else "None"}

EXCLUDED ART STYLES (must use different ones):
{', '.join(excluded_styles) if excluded_styles else "None"}

Return a JSON object with EXACTLY this structure:
{{
    "game_name": "{game_name}",
    "genre": "{genre}",
    "tagline": "A catchy one-line description",
    "mechanics": {{
        "primary": "main gameplay mechanic",
        "secondary": ["supporting", "mechanics"],
        "selected_from_library": {json.dumps(mechanics)}
    }},
    "core_loop": {{
        "description": "What the player does repeatedly",
        "session_length_seconds": 60-180,
        "primary_action": "tap/swipe/drag/hold",
        "reward_cycle": "How player is rewarded"
    }},
    "progression": {{
        "level_count": 10,
        "free_levels": [1, 2, 3],
        "locked_levels": [4, 5, 6, 7, 8, 9, 10],
        "unlock_method": "rewarded_ad",
        "difficulty_increase_per_level": "description of how difficulty increases"
    }},
    "economy": {{
        "primary_currency": "coins/stars/points",
        "earn_rate_per_level": number,
        "uses": ["what currency is used for"]
    }},
    "fail_states": {{
        "conditions": ["list of ways to fail"],
        "consequence": "what happens on fail",
        "retry_cost": "free/ad/currency"
    }},
    "difficulty_curve": {{
        "level_1": {{ "description": "...", "target_completion_rate": 0.95 }},
        "level_5": {{ "description": "...", "target_completion_rate": 0.70 }},
        "level_10": {{ "description": "...", "target_completion_rate": 0.40 }},
        "scaling_factors": ["what makes later levels harder"]
    }},
    "analytics_plan": {{
        "key_events": [
            "game_start", "level_start", "level_complete", "level_fail",
            "unlock_prompt_shown", "rewarded_ad_started", "rewarded_ad_completed",
            "rewarded_ad_failed", "level_unlocked"
        ],
        "key_metrics": ["retention", "completion_rate", "ad_opt_in_rate"],
        "funnel_stages": ["install", "tutorial", "level_3", "first_ad", "level_10"]
    }},
    "asset_style_guide": {{
        "art_style": "colorful_cartoon/pixel_retro/minimal_flat/etc (NOT from excluded list)",
        "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
        "character_style": "description of character art",
        "environment_style": "description of backgrounds",
        "ui_style": "description of UI elements",
        "audio_style": "upbeat/calm/retro/etc"
    }},
    "technical_requirements": {{
        "target_fps": 60,
        "min_android_sdk": 21,
        "orientation": "portrait",
        "offline_capable": true
    }}
}}"""

        logger.info(
            "generating_gdd_with_claude",
            game_name=game_name,
            genre=genre,
            mechanics=mechanics,
            attempt=attempt_number,
        )

        # Use slightly higher temperature for more creative variation on retries
        temperature = min(0.9, 0.6 + (attempt_number * 0.1))

        response = await self._call_ai(
            system_prompt,
            user_prompt,
            temperature=temperature,
            max_tokens=4096,
        )

        # Parse JSON response
        try:
            # Clean response if it has markdown code blocks
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
                response = response.strip()
            
            gdd = json.loads(response)
            logger.info("gdd_generated_successfully", game_name=game_name)
            return gdd
        except json.JSONDecodeError as e:
            logger.error("gdd_json_parse_error", error=str(e), response=response[:500])
            raise ValueError(f"Failed to parse GDD JSON: {e}")

    async def generate_dart_code(
        self,
        file_purpose: str,
        game_context: Dict[str, Any],
        template: Optional[str] = None,
        additional_instructions: Optional[str] = None,
    ) -> str:
        """
        Generate Dart/Flutter code for a specific file.
        
        Claude excels at code generation with proper structure and documentation.
        
        Args:
            file_purpose: What the file should do (e.g., "main game class", "player component")
            game_context: GDD and other game information
            template: Optional template code to base generation on
            additional_instructions: Extra requirements
        
        Returns:
            Generated Dart code as a string
        """
        system_prompt = """You are an expert Flutter and Flame game developer.
Generate clean, well-documented Dart code following best practices.

RULES:
1. Use Flame 1.x API conventions
2. Include all necessary imports at the top
3. Add documentation comments (///) for classes and public methods
4. Handle errors gracefully with try-catch where appropriate
5. Follow Dart style guide (snake_case for files, PascalCase for classes)
6. Return ONLY the Dart code, no markdown formatting or explanations
7. Start directly with import statements or the main code"""

        user_prompt = f"""Generate Dart code for: {file_purpose}

GAME CONTEXT:
{json.dumps(game_context, indent=2)}

{f"TEMPLATE TO FOLLOW:{chr(10)}{template}" if template else ""}

{f"ADDITIONAL INSTRUCTIONS:{chr(10)}{additional_instructions}" if additional_instructions else ""}

Return only valid Dart code. Start with imports, no markdown."""

        response = await self._call_ai(
            system_prompt,
            user_prompt,
            temperature=0.3,  # Lower temperature for more consistent code
            max_tokens=8192,
        )

        # Clean response of any markdown
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            code_lines = []
            in_code_block = False
            for line in lines:
                if line.startswith("```"):
                    in_code_block = not in_code_block
                    continue
                if in_code_block or not line.startswith("```"):
                    code_lines.append(line)
            response = "\n".join(code_lines)

        return response.strip()

    async def generate_level_configs(
        self,
        gdd: Dict[str, Any],
        level_count: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Generate level configurations based on the GDD.
        
        Args:
            gdd: Game Design Document
            level_count: Number of levels to generate
        
        Returns:
            List of level configuration dictionaries
        """
        system_prompt = """You are a game level designer specializing in mobile casual games.
Create balanced level configurations with a smooth difficulty curve.

Return ONLY a JSON array of level configurations.
Start directly with [ and end with ]. No markdown or explanations."""

        user_prompt = f"""Generate {level_count} level configurations for this game:

GDD SUMMARY:
- Genre: {gdd.get('genre', 'casual')}
- Core Loop: {gdd.get('core_loop', {}).get('description', 'N/A')}
- Difficulty Curve: {json.dumps(gdd.get('difficulty_curve', {}), indent=2)}
- Mechanics: {json.dumps(gdd.get('mechanics', {}), indent=2)}

Generate a JSON array with {level_count} levels. Each level should have:
{{
    "level_number": 1-{level_count},
    "name": "Level Name",
    "is_free": true for levels 1-3, false for 4-10,
    "unlock_requirement": "none" or "rewarded_ad",
    "difficulty": 0.0-1.0,
    "time_limit_seconds": number or null,
    "target_score": number,
    "obstacles": {{ "type": "...", "count": number, "speed": number }},
    "collectibles": {{ "type": "...", "count": number, "value": number }},
    "special_features": ["list of level-specific features"],
    "background_theme": "theme name",
    "music_track": "track identifier"
}}

Return only the JSON array, starting with ["""

        response = await self._call_ai(
            system_prompt,
            user_prompt,
            temperature=0.5,
            max_tokens=4096,
        )

        # Parse JSON
        try:
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
                response = response.strip()
            
            levels = json.loads(response)
            return levels
        except json.JSONDecodeError as e:
            logger.error("level_config_parse_error", error=str(e))
            raise ValueError(f"Failed to parse level configs: {e}")

    async def generate_asset_prompt(
        self,
        asset_type: str,
        game_context: Dict[str, Any],
        specific_requirements: Optional[str] = None,
    ) -> str:
        """
        Generate an optimized prompt for AI image generation (DALL-E).
        
        Args:
            asset_type: Type of asset (sprite, background, ui, etc.)
            game_context: GDD and style information
            specific_requirements: Specific details for this asset
        
        Returns:
            Optimized prompt for image generation
        """
        style_guide = game_context.get("asset_style_guide", {})
        
        system_prompt = """You are an expert at writing prompts for AI image generation.
Create concise, effective prompts that produce consistent game assets.

RULES:
1. Be specific about style, colors, and composition
2. Include "game asset" and "transparent background" for sprites
3. Mention the art style consistently
4. Keep prompts under 150 words
5. Return ONLY the prompt text, nothing else"""

        user_prompt = f"""Create an image generation prompt for:

ASSET TYPE: {asset_type}
ART STYLE: {style_guide.get('art_style', 'colorful cartoon')}
COLOR PALETTE: {style_guide.get('color_palette', ['#FF6B6B', '#4ECDC4', '#45B7D1'])}
GAME GENRE: {game_context.get('genre', 'casual')}

{f"SPECIFIC REQUIREMENTS: {specific_requirements}" if specific_requirements else ""}

Return only the image generation prompt, no explanations."""

        response = await self._call_ai(
            system_prompt,
            user_prompt,
            temperature=0.6,
            max_tokens=300,
        )

        return response.strip()

    async def analyze_code_quality(
        self,
        code: str,
        language: str = "dart",
    ) -> Dict[str, Any]:
        """
        Analyze code quality and suggest improvements.
        
        Args:
            code: Source code to analyze
            language: Programming language
        
        Returns:
            Analysis results with score and suggestions
        """
        system_prompt = f"""You are a senior {language} developer and code reviewer.
Analyze the provided code and return a JSON assessment.

Return ONLY a JSON object, starting with {{ and ending with }}."""

        user_prompt = f"""Analyze this {language} code:

{code}

Return a JSON object with this structure:
{{
    "quality_score": 0-100,
    "issues": [
        {{"severity": "error/warning/info", "line": number, "message": "description"}}
    ],
    "suggestions": ["improvement suggestions"],
    "complexity": "low/medium/high",
    "test_coverage_recommendation": "what should be tested"
}}"""

        response = await self._call_ai(
            system_prompt,
            user_prompt,
            temperature=0.2,
            max_tokens=2048,
        )

        try:
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
                response = response.strip()
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "quality_score": 70,
                "issues": [],
                "suggestions": ["Could not parse AI response"],
                "complexity": "unknown",
            }

    async def chat(
        self,
        message: str,
        context: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        """
        General chat completion with Claude.
        
        Args:
            message: User message
            context: Optional context/system prompt
            temperature: Creativity level
        
        Returns:
            Claude's response
        """
        system = context or "You are a helpful AI assistant for game development."
        
        return await self._call_ai(
            system,
            message,
            temperature=temperature,
            max_tokens=4096,
        )


# Singleton instance
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get or create the AI service singleton."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
