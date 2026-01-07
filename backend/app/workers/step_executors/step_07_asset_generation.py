"""
Step 7: AI Asset Generation

Generates all visual and audio assets for the game using AI:
- Sprites (player, enemies, obstacles, collectibles)
- Backgrounds
- UI elements (buttons, panels, icons)
- Particle textures
- Sound effects
- Background music loops
- Texture atlases

Assets must match the GDD style guide and be optimized for mobile.
"""

import base64
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.asset import GameAsset
from app.services.asset_service import get_asset_service
from app.services.github_service import get_github_service
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


class AssetGenerationStep(BaseStepExecutor):
    """
    Step 7: Generate all game assets using AI.
    
    Uses DALL-E for images and generates placeholder audio.
    Creates texture atlases and optimizes for mobile.
    """

    step_number = 7
    step_name = "asset_generation"

    def __init__(self):
        super().__init__()
        self.asset_service = get_asset_service()
        self.github_service = get_github_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Generate all assets for the game."""
        self.logger.info("generating_assets", game_id=str(game.id))

        logs = []
        logs.append(f"Starting asset generation for {game.name}")

        try:
            # Check prerequisites
            if not game.gdd_spec:
                return {
                    "success": False,
                    "error": "Missing GDD spec",
                    "logs": "\n".join(logs),
                }

            if not game.github_repo:
                return {
                    "success": False,
                    "error": "Missing GitHub repo",
                    "logs": "\n".join(logs),
                }

            style_guide = game.gdd_spec.get("asset_style_guide", {})
            logs.append(f"Art style: {style_guide.get('art_style', 'colorful_cartoon')}")
            logs.append(f"Audio style: {style_guide.get('audio_style', 'upbeat')}")

            # Create temp directory for assets
            work_dir = Path(tempfile.mkdtemp(prefix=f"assets_{game.slug}_"))
            logs.append(f"Working directory: {work_dir}")

            # Step 7.1: Generate all assets
            logs.append("\n--- Generating Assets ---")
            generation_result = await self.asset_service.generate_all_assets(
                game_id=str(game.id),
                gdd=game.gdd_spec,
            )

            # Log results
            for asset in generation_result.get("assets", []):
                logs.append(f"✓ Generated {asset['type']}: {asset['name']}")
                
                # Save asset record to database
                db_asset = GameAsset(
                    game_id=game.id,
                    asset_type=asset["type"],
                    filename=asset["name"],
                    local_path=asset["path"],
                    width=asset["size"][0],
                    height=asset["size"][1],
                    ai_prompt=asset.get("prompt"),
                    asset_metadata={
                        "frames": asset.get("frames", 1),
                        "sprite_sheet": asset.get("sprite_sheet"),
                        "file_size": self._get_file_size(asset["path"]),
                    },
                )
                db.add(db_asset)

            for error in generation_result.get("errors", []):
                logs.append(f"⚠ Error: {error}")

            # Audio assets
            audio_result = generation_result.get("audio", {})
            logs.append(f"\n--- Audio Assets ---")
            logs.append(f"Style: {audio_result.get('style', 'N/A')}")
            for sfx in audio_result.get("sfx", []):
                logs.append(f"✓ SFX: {sfx['name']} {'(placeholder)' if sfx.get('placeholder') else ''}")
            for music in audio_result.get("music", []):
                logs.append(f"✓ Music: {music['name']} {'(placeholder)' if music.get('placeholder') else ''}")

            # Texture atlas
            logs.append("\n--- Texture Atlas ---")
            for atlas in generation_result.get("texture_atlases", []):
                if atlas.get("success"):
                    logs.append(f"✓ Atlas created: {atlas['sprite_count']} sprites, {atlas['size']}")
                else:
                    logs.append(f"⚠ Atlas failed: {atlas.get('error')}")

            # Step 7.2: Optimize assets for mobile
            logs.append("\n--- Optimizing for Mobile ---")
            source_path = self.asset_service.storage_path / str(game.id)
            if source_path.exists():
                optimize_result = await self.asset_service.optimize_assets_for_mobile(source_path)
                logs.append(f"Optimized {len(optimize_result.get('optimized', []))} files")
                logs.append(f"Total savings: {optimize_result.get('total_savings', '0 KB')}")

            # Step 7.3: Upload assets to GitHub
            logs.append("\n--- Uploading to GitHub ---")
            upload_result = await self._upload_assets_to_github(
                game=game,
                source_path=source_path,
            )

            if upload_result["success"]:
                logs.append(f"✓ Uploaded {upload_result['file_count']} asset files to GitHub")
            else:
                logs.append(f"⚠ Upload failed: {upload_result.get('error', 'Unknown')}")

            await db.commit()

            logs.append("\n--- Asset Generation Complete ---")

            # Validate
            validation = await self.validate(
                db,
                game,
                {
                    "assets": generation_result.get("assets", []),
                    "errors": generation_result.get("errors", []),
                    "atlases": generation_result.get("texture_atlases", []),
                },
            )

            return {
                "success": validation["valid"],
                "artifacts": {
                    "total_assets": len(generation_result.get("assets", [])),
                    "image_assets": len([a for a in generation_result.get("assets", []) if a["type"] != "audio"]),
                    "audio_assets": len(audio_result.get("sfx", [])) + len(audio_result.get("music", [])),
                    "texture_atlases": len(generation_result.get("texture_atlases", [])),
                    "errors": len(generation_result.get("errors", [])),
                    "github_uploaded": upload_result["success"],
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("asset_generation_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    async def _upload_assets_to_github(
        self,
        game: Game,
        source_path: Path,
    ) -> Dict[str, Any]:
        """Upload generated assets to GitHub repository."""
        if not source_path.exists():
            return {"success": False, "error": "Source path does not exist"}

        try:
            files_to_upload = {}

            # Collect all asset files
            for file_path in source_path.rglob("*"):
                if file_path.is_file():
                    relative_path = file_path.relative_to(source_path)
                    github_path = f"assets/{relative_path}"

                    # For binary files, we need to handle differently
                    if file_path.suffix.lower() in [".png", ".jpg", ".jpeg", ".wav", ".mp3"]:
                        # Read as binary and base64 encode for API
                        with open(file_path, "rb") as f:
                            content = base64.b64encode(f.read()).decode("utf-8")
                        files_to_upload[github_path] = {
                            "content": content,
                            "encoding": "base64",
                        }
                    else:
                        # Text files
                        with open(file_path, "r") as f:
                            files_to_upload[github_path] = f.read()

            if not files_to_upload:
                return {"success": True, "file_count": 0}

            # Upload files one by one (GitHub API handles binary differently)
            uploaded = 0
            for path, content in files_to_upload.items():
                try:
                    if isinstance(content, dict) and content.get("encoding") == "base64":
                        # Binary file - use base64
                        result = await self._upload_binary_file(
                            game.github_repo,
                            path,
                            content["content"],
                        )
                    else:
                        # Text file
                        result = await self.github_service.create_file(
                            repo_name=game.github_repo,
                            file_path=path,
                            content=content,
                            commit_message=f"Add asset: {path}",
                        )

                    if result.get("success"):
                        uploaded += 1
                except Exception as e:
                    logger.warning("file_upload_failed", path=path, error=str(e))

            return {
                "success": uploaded > 0,
                "file_count": uploaded,
                "total_files": len(files_to_upload),
            }

        except Exception as e:
            logger.exception("asset_upload_failed", error=str(e))
            return {"success": False, "error": str(e)}

    async def _upload_binary_file(
        self,
        repo_name: str,
        file_path: str,
        base64_content: str,
    ) -> Dict[str, Any]:
        """Upload a binary file to GitHub using base64 encoding."""
        self.github_service._ensure_client()
        
        try:
            repo = self.github_service._get_repo(repo_name)
            
            # Try to get existing file
            try:
                existing = repo.get_contents(file_path)
                result = repo.update_file(
                    file_path,
                    f"Update asset: {file_path}",
                    base64.b64decode(base64_content),
                    existing.sha,
                )
            except Exception:
                result = repo.create_file(
                    file_path,
                    f"Add asset: {file_path}",
                    base64.b64decode(base64_content),
                )
            
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _get_file_size(self, path: str) -> int:
        """Get file size in bytes."""
        try:
            return Path(path).stat().st_size
        except Exception:
            return 0

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate generated assets."""
        errors = []
        warnings = []

        assets = artifacts.get("assets", [])
        generation_errors = artifacts.get("errors", [])
        atlases = artifacts.get("atlases", [])

        # Check minimum required assets
        required_types = ["player", "obstacle", "collectible", "background"]
        generated_types = [a["type"] for a in assets]
        
        for required in required_types:
            if required not in generated_types:
                warnings.append(f"Missing recommended asset type: {required}")

        # Check for generation errors
        if len(generation_errors) > len(assets) / 2:
            errors.append(f"Too many generation errors: {len(generation_errors)}")

        # Check texture atlas
        successful_atlases = [a for a in atlases if a.get("success")]
        if not successful_atlases:
            warnings.append("No texture atlas created")

        # Verify files exist
        for asset in assets:
            if not Path(asset.get("path", "")).exists():
                warnings.append(f"Asset file not found: {asset.get('name')}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "asset_count": len(assets),
            "error_count": len(generation_errors),
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback asset generation."""
        from sqlalchemy import delete
        
        # Delete asset records
        await db.execute(
            delete(GameAsset).where(GameAsset.game_id == game.id)
        )
        
        # Delete asset files
        asset_path = self.asset_service.storage_path / str(game.id)
        if asset_path.exists():
            shutil.rmtree(asset_path)
        
        await db.commit()
        
        self.logger.info("assets_rolled_back", game_id=str(game.id))
        return True
