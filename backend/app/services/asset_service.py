"""
Asset Generation Service

Handles AI-powered asset generation for games:
- Sprite generation using DALL-E or Stable Diffusion
- Audio generation for sound effects and music
- Texture atlas creation
- Asset optimization for mobile
"""

import asyncio
import base64
import io
import json
import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import structlog
from PIL import Image

from app.core.config import settings
from app.services.ai_service import get_ai_service

logger = structlog.get_logger()


# Asset specifications for different game elements
ASSET_SPECS = {
    "player": {
        "size": (128, 128),
        "frames": 4,
        "format": "png",
        "transparent": True,
    },
    "enemy": {
        "size": (96, 96),
        "frames": 4,
        "format": "png",
        "transparent": True,
    },
    "obstacle": {
        "size": (64, 64),
        "frames": 1,
        "format": "png",
        "transparent": True,
    },
    "collectible": {
        "size": (48, 48),
        "frames": 4,
        "format": "png",
        "transparent": True,
    },
    "background": {
        "size": (1080, 1920),
        "frames": 1,
        "format": "png",
        "transparent": False,
    },
    "ui_button": {
        "size": (200, 80),
        "frames": 1,
        "format": "png",
        "transparent": True,
    },
    "ui_panel": {
        "size": (400, 300),
        "frames": 1,
        "format": "png",
        "transparent": True,
    },
    "icon": {
        "size": (512, 512),
        "frames": 1,
        "format": "png",
        "transparent": False,
    },
    "particle": {
        "size": (32, 32),
        "frames": 1,
        "format": "png",
        "transparent": True,
    },
}


class AssetService:
    """
    Service for generating and managing game assets.
    
    Uses AI image generation APIs (OpenAI DALL-E, Stable Diffusion)
    and audio generation for sound effects and music.
    """

    def __init__(self):
        self.ai_service = get_ai_service()
        self.storage_path = Path(settings.asset_storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # OpenAI client for DALL-E
        self.openai_client = None
        if settings.openai_api_key:
            from openai import AsyncOpenAI
            self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate_all_assets(
        self,
        game_id: str,
        gdd: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate all required assets for a game.
        
        Args:
            game_id: Game identifier
            gdd: Game Design Document
        
        Returns:
            Dictionary with generated asset information
        """
        logger.info("generating_all_assets", game_id=game_id)

        # Create game asset directory
        game_asset_path = self.storage_path / game_id
        game_asset_path.mkdir(parents=True, exist_ok=True)

        results = {
            "game_id": game_id,
            "assets": [],
            "errors": [],
            "texture_atlases": [],
        }

        style_guide = gdd.get("asset_style_guide", {})

        # Define assets to generate
        asset_requests = [
            {"type": "player", "name": "player", "description": "Main player character sprite"},
            {"type": "enemy", "name": "enemy_basic", "description": "Basic enemy sprite"},
            {"type": "obstacle", "name": "obstacle", "description": "Obstacle to avoid"},
            {"type": "collectible", "name": "coin", "description": "Collectible coin"},
            {"type": "collectible", "name": "star", "description": "Bonus star collectible"},
            {"type": "background", "name": "bg_level1", "description": "Level 1 background"},
            {"type": "background", "name": "bg_level2", "description": "Level 2 background"},
            {"type": "icon", "name": "app_icon", "description": "App icon"},
            {"type": "ui_button", "name": "btn_play", "description": "Play button"},
            {"type": "ui_panel", "name": "panel_menu", "description": "Menu panel background"},
            {"type": "particle", "name": "particle_star", "description": "Star particle effect"},
        ]

        # Generate each asset
        for request in asset_requests:
            try:
                result = await self.generate_asset(
                    game_id=game_id,
                    asset_type=request["type"],
                    asset_name=request["name"],
                    description=request["description"],
                    style_guide=style_guide,
                    output_path=game_asset_path,
                )
                results["assets"].append(result)
            except Exception as e:
                logger.error(
                    "asset_generation_failed",
                    asset_name=request["name"],
                    error=str(e),
                )
                results["errors"].append({
                    "asset": request["name"],
                    "error": str(e),
                })

        # Generate audio assets
        audio_assets = await self.generate_audio_assets(game_id, gdd, game_asset_path)
        results["audio"] = audio_assets

        # Create texture atlases
        try:
            atlas_result = await self.create_texture_atlas(
                game_asset_path,
                game_asset_path / "atlas",
            )
            results["texture_atlases"].append(atlas_result)
        except Exception as e:
            logger.error("atlas_creation_failed", error=str(e))
            results["errors"].append({"atlas": str(e)})

        logger.info(
            "assets_generation_complete",
            game_id=game_id,
            asset_count=len(results["assets"]),
            error_count=len(results["errors"]),
        )

        return results

    async def generate_asset(
        self,
        game_id: str,
        asset_type: str,
        asset_name: str,
        description: str,
        style_guide: Dict[str, Any],
        output_path: Path,
    ) -> Dict[str, Any]:
        """
        Generate a single game asset using AI.
        
        Args:
            game_id: Game identifier
            asset_type: Type of asset (player, enemy, background, etc.)
            asset_name: Name for the asset file
            description: Description for AI prompt
            style_guide: Visual style guide from GDD
            output_path: Directory to save asset
        
        Returns:
            Asset generation result
        """
        spec = ASSET_SPECS.get(asset_type, ASSET_SPECS["obstacle"])
        
        # Generate optimized prompt
        prompt = await self._create_asset_prompt(
            asset_type=asset_type,
            description=description,
            style_guide=style_guide,
            spec=spec,
        )

        logger.info(
            "generating_asset",
            game_id=game_id,
            asset_type=asset_type,
            asset_name=asset_name,
        )

        # Generate image
        image_data = await self._generate_image(prompt, spec["size"])

        if image_data is None:
            # Use placeholder if generation fails
            image_data = self._create_placeholder_image(spec["size"], asset_type)

        # Save image
        images_path = output_path / "images"
        images_path.mkdir(parents=True, exist_ok=True)
        
        file_path = images_path / f"{asset_name}.{spec['format']}"
        
        # Process image (resize, optimize)
        processed_image = self._process_image(image_data, spec)
        processed_image.save(str(file_path), format=spec["format"].upper())

        # Generate sprite sheet if multiple frames needed
        sprite_sheet_path = None
        if spec["frames"] > 1:
            sprite_sheet_path = await self._generate_sprite_sheet(
                processed_image,
                spec["frames"],
                images_path / f"{asset_name}_sheet.{spec['format']}",
            )

        return {
            "name": asset_name,
            "type": asset_type,
            "path": str(file_path),
            "sprite_sheet": str(sprite_sheet_path) if sprite_sheet_path else None,
            "size": spec["size"],
            "frames": spec["frames"],
            "prompt": prompt,
        }

    async def _create_asset_prompt(
        self,
        asset_type: str,
        description: str,
        style_guide: Dict[str, Any],
        spec: Dict[str, Any],
    ) -> str:
        """Create an optimized prompt for image generation."""
        art_style = style_guide.get("art_style", "colorful cartoon")
        colors = style_guide.get("color_palette", ["#FF6B6B", "#4ECDC4", "#45B7D1"])
        
        # Format colors for prompt
        color_str = ", ".join(colors[:3]) if colors else "vibrant colors"

        base_prompts = {
            "player": f"2D game character sprite, {description}, {art_style} style, facing right, " +
                     f"colors: {color_str}, simple design, game asset, transparent background",
            "enemy": f"2D game enemy sprite, {description}, {art_style} style, menacing but cute, " +
                    f"colors: {color_str}, game asset, transparent background",
            "obstacle": f"2D game obstacle, {description}, {art_style} style, " +
                       f"colors: {color_str}, simple shape, game asset, transparent background",
            "collectible": f"2D game collectible item, {description}, {art_style} style, shiny, " +
                          f"colors: {color_str}, simple design, game asset, transparent background",
            "background": f"Mobile game background, {description}, {art_style} style, portrait orientation, " +
                         f"colors: {color_str}, parallax layers, seamless edges, game art",
            "ui_button": f"Game UI button, {description}, {art_style} style, rounded corners, " +
                        f"colors: {color_str}, glossy, transparent background",
            "ui_panel": f"Game UI panel, {description}, {art_style} style, decorative border, " +
                       f"semi-transparent, colors: {color_str}",
            "icon": f"Mobile game app icon, {description}, {art_style} style, " +
                   f"colors: {color_str}, bold, recognizable, square format",
            "particle": f"Small particle effect sprite, {description}, {art_style} style, " +
                       f"glowing, transparent background, colors: {color_str}",
        }

        return base_prompts.get(asset_type, f"2D game asset, {description}, {art_style} style")

    async def _generate_image(
        self,
        prompt: str,
        size: Tuple[int, int],
    ) -> Optional[Image.Image]:
        """Generate image using DALL-E API."""
        if not self.openai_client:
            logger.warning("openai_not_available", message="Using placeholder images")
            return None

        try:
            # DALL-E requires specific sizes, use closest
            dalle_size = self._get_dalle_size(size)
            
            response = await self.openai_client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=dalle_size,
                quality="standard",
                n=1,
                response_format="b64_json",
            )

            # Decode base64 image
            image_data = base64.b64decode(response.data[0].b64_json)
            image = Image.open(io.BytesIO(image_data))
            
            logger.info("image_generated_successfully", size=dalle_size)
            return image

        except Exception as e:
            logger.error("dalle_generation_failed", error=str(e))
            return None

    def _get_dalle_size(self, size: Tuple[int, int]) -> str:
        """Get closest DALL-E supported size."""
        # DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
        w, h = size
        if h > w:
            return "1024x1792"
        elif w > h:
            return "1792x1024"
        else:
            return "1024x1024"

    def _create_placeholder_image(
        self,
        size: Tuple[int, int],
        asset_type: str,
    ) -> Image.Image:
        """Create a placeholder image when AI generation is unavailable."""
        # Create colored placeholder based on asset type
        colors = {
            "player": (100, 150, 255, 255),  # Blue
            "enemy": (255, 100, 100, 255),   # Red
            "obstacle": (150, 150, 150, 255), # Gray
            "collectible": (255, 215, 0, 255), # Gold
            "background": (50, 50, 80, 255),  # Dark blue
            "ui_button": (100, 200, 100, 255), # Green
            "ui_panel": (80, 80, 100, 200),   # Semi-transparent gray
            "icon": (150, 100, 255, 255),     # Purple
            "particle": (255, 255, 200, 255), # Yellow
        }
        
        color = colors.get(asset_type, (128, 128, 128, 255))
        
        # Create image with alpha channel
        image = Image.new("RGBA", size, color)
        
        # Add simple shape to indicate it's a placeholder
        from PIL import ImageDraw
        draw = ImageDraw.Draw(image)
        
        # Draw X pattern
        margin = min(size) // 4
        draw.line([(margin, margin), (size[0] - margin, size[1] - margin)], 
                  fill=(255, 255, 255, 128), width=3)
        draw.line([(size[0] - margin, margin), (margin, size[1] - margin)], 
                  fill=(255, 255, 255, 128), width=3)
        
        return image

    def _process_image(
        self,
        image: Image.Image,
        spec: Dict[str, Any],
    ) -> Image.Image:
        """Process and optimize image for game use."""
        target_size = spec["size"]
        
        # Resize to target size
        if image.size != target_size:
            image = image.resize(target_size, Image.Resampling.LANCZOS)
        
        # Convert to RGBA if transparent needed
        if spec["transparent"] and image.mode != "RGBA":
            image = image.convert("RGBA")
        elif not spec["transparent"] and image.mode == "RGBA":
            # Add white background
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        
        return image

    async def _generate_sprite_sheet(
        self,
        base_image: Image.Image,
        frame_count: int,
        output_path: Path,
    ) -> Path:
        """Generate a simple sprite sheet from base image."""
        width, height = base_image.size
        
        # Create sprite sheet with frames side by side
        sheet = Image.new("RGBA", (width * frame_count, height))
        
        for i in range(frame_count):
            # Create slight variation for each frame
            frame = base_image.copy()
            
            # Simple animation: slight rotation
            angle = (i - frame_count // 2) * 2
            frame = frame.rotate(angle, expand=False, fillcolor=(0, 0, 0, 0))
            
            sheet.paste(frame, (i * width, 0))
        
        sheet.save(str(output_path), "PNG")
        return output_path

    async def generate_audio_assets(
        self,
        game_id: str,
        gdd: Dict[str, Any],
        output_path: Path,
    ) -> Dict[str, Any]:
        """
        Generate or provide audio assets.
        
        Note: Full AI audio generation requires specialized APIs.
        This implementation creates placeholder audio metadata.
        """
        audio_path = output_path / "audio"
        audio_path.mkdir(parents=True, exist_ok=True)

        style_guide = gdd.get("asset_style_guide", {})
        audio_style = style_guide.get("audio_style", "upbeat")

        # Define required audio assets
        audio_assets = {
            "sfx": [
                {"name": "jump", "description": "Jump sound effect"},
                {"name": "collect", "description": "Collect item sound"},
                {"name": "hit", "description": "Player hit sound"},
                {"name": "success", "description": "Level complete fanfare"},
                {"name": "fail", "description": "Game over sound"},
                {"name": "button", "description": "UI button click"},
            ],
            "music": [
                {"name": "menu", "description": "Menu background music"},
                {"name": "gameplay", "description": "In-game background music"},
                {"name": "victory", "description": "Victory music"},
            ],
        }

        result = {
            "style": audio_style,
            "sfx": [],
            "music": [],
            "note": "Audio files should be added manually or via audio generation API",
        }

        # Create audio metadata file
        metadata = {
            "game_id": game_id,
            "audio_style": audio_style,
            "required_assets": audio_assets,
            "format": "mp3",
            "sample_rate": 44100,
        }

        metadata_path = audio_path / "audio_manifest.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        result["manifest_path"] = str(metadata_path)

        # Create placeholder silent audio files using wave
        try:
            import wave
            import struct
            
            for sfx in audio_assets["sfx"]:
                file_path = audio_path / f"{sfx['name']}.wav"
                self._create_placeholder_audio(file_path, duration=0.5)
                result["sfx"].append({
                    "name": sfx["name"],
                    "path": str(file_path),
                    "placeholder": True,
                })
            
            for music in audio_assets["music"]:
                file_path = audio_path / f"{music['name']}.wav"
                self._create_placeholder_audio(file_path, duration=3.0)
                result["music"].append({
                    "name": music["name"],
                    "path": str(file_path),
                    "placeholder": True,
                })
                
        except Exception as e:
            logger.warning("audio_placeholder_creation_failed", error=str(e))

        return result

    def _create_placeholder_audio(self, path: Path, duration: float = 1.0):
        """Create a placeholder silent audio file."""
        import wave
        import struct
        
        sample_rate = 44100
        num_samples = int(sample_rate * duration)
        
        with wave.open(str(path), "w") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            
            # Generate silence with very quiet noise to avoid issues
            for _ in range(num_samples):
                wav.writeframes(struct.pack("h", 0))

    async def create_texture_atlas(
        self,
        source_path: Path,
        output_path: Path,
    ) -> Dict[str, Any]:
        """
        Create a texture atlas from individual sprites.
        
        Args:
            source_path: Directory containing sprite images
            output_path: Output directory for atlas
        
        Returns:
            Atlas creation result with metadata
        """
        output_path.mkdir(parents=True, exist_ok=True)
        
        images_path = source_path / "images"
        if not images_path.exists():
            return {"success": False, "error": "No images directory found"}

        # Collect all PNG images
        sprites = list(images_path.glob("*.png"))
        
        if not sprites:
            return {"success": False, "error": "No sprites found"}

        # Load images
        loaded = []
        for sprite_path in sprites:
            try:
                img = Image.open(sprite_path)
                loaded.append({
                    "name": sprite_path.stem,
                    "image": img,
                    "size": img.size,
                })
            except Exception as e:
                logger.warning("sprite_load_failed", path=str(sprite_path), error=str(e))

        if not loaded:
            return {"success": False, "error": "Failed to load any sprites"}

        # Simple bin packing - arrange in a grid
        atlas_size = self._calculate_atlas_size(loaded)
        atlas = Image.new("RGBA", atlas_size, (0, 0, 0, 0))

        # Place sprites and generate metadata
        metadata = {
            "frames": {},
            "meta": {
                "size": {"w": atlas_size[0], "h": atlas_size[1]},
                "format": "RGBA8888",
            },
        }

        x, y = 0, 0
        row_height = 0
        padding = 2

        for sprite in loaded:
            img = sprite["image"]
            w, h = sprite["size"]

            # Check if we need to move to next row
            if x + w > atlas_size[0]:
                x = 0
                y += row_height + padding
                row_height = 0

            # Place sprite
            atlas.paste(img, (x, y))

            # Record metadata
            metadata["frames"][sprite["name"]] = {
                "frame": {"x": x, "y": y, "w": w, "h": h},
                "sourceSize": {"w": w, "h": h},
            }

            row_height = max(row_height, h)
            x += w + padding

        # Save atlas
        atlas_path = output_path / "atlas.png"
        atlas.save(str(atlas_path), "PNG")

        metadata_path = output_path / "atlas.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(
            "texture_atlas_created",
            size=atlas_size,
            sprite_count=len(loaded),
        )

        return {
            "success": True,
            "atlas_path": str(atlas_path),
            "metadata_path": str(metadata_path),
            "size": atlas_size,
            "sprite_count": len(loaded),
        }

    def _calculate_atlas_size(self, sprites: List[Dict]) -> Tuple[int, int]:
        """Calculate optimal atlas size for sprites."""
        total_area = sum(s["size"][0] * s["size"][1] for s in sprites)
        
        # Start with square root of total area
        side = int((total_area * 1.5) ** 0.5)
        
        # Round up to power of 2
        size = 256
        while size < side:
            size *= 2
        
        # Cap at 4096
        size = min(size, 4096)
        
        return (size, size)

    async def optimize_assets_for_mobile(
        self,
        asset_path: Path,
    ) -> Dict[str, Any]:
        """
        Optimize all assets for mobile deployment.
        
        Args:
            asset_path: Directory containing assets
        
        Returns:
            Optimization results
        """
        results = {
            "optimized": [],
            "original_size": 0,
            "optimized_size": 0,
        }

        images_path = asset_path / "images"
        if not images_path.exists():
            return results

        for img_path in images_path.glob("*.png"):
            original_size = img_path.stat().st_size
            results["original_size"] += original_size

            try:
                # Load and optimize
                img = Image.open(img_path)
                
                # Convert to PNG8 with palette if not too many colors
                if img.mode == "RGBA":
                    # Keep alpha, but optimize
                    img = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
                    img = img.convert("RGBA")
                
                # Save optimized
                img.save(str(img_path), "PNG", optimize=True)
                
                new_size = img_path.stat().st_size
                results["optimized_size"] += new_size
                
                results["optimized"].append({
                    "file": img_path.name,
                    "original": original_size,
                    "optimized": new_size,
                    "savings": f"{((original_size - new_size) / original_size * 100):.1f}%",
                })
                
            except Exception as e:
                logger.warning("optimization_failed", file=str(img_path), error=str(e))

        total_savings = results["original_size"] - results["optimized_size"]
        results["total_savings"] = f"{total_savings / 1024:.1f} KB"
        
        return results


# Singleton instance
_asset_service: Optional[AssetService] = None


def get_asset_service() -> AssetService:
    """Get or create the asset service singleton."""
    global _asset_service
    if _asset_service is None:
        _asset_service = AssetService()
    return _asset_service
