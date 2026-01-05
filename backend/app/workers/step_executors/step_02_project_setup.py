"""
Step 2: Project Setup

Creates the GitHub repository and scaffolds the Flutter + Flame project:
- Create GitHub repository for the game
- Clone selected Flame template
- Apply GameFactory structure
- Configure Flutter project (pubspec.yaml, etc.)
- Set up GitHub Actions for CI/CD
- Validate with flutter analyze (if Flutter SDK available)
"""

import tempfile
from pathlib import Path
from typing import Any, Dict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.game import Game
from app.services.github_service import get_github_service
from app.services.template_service import get_template_service
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


class ProjectSetupStep(BaseStepExecutor):
    """
    Step 2: Create GitHub repo and scaffold project.
    
    Uses real GitHub API for repository creation and 
    Template service for project scaffolding.
    """

    step_number = 2
    step_name = "project_setup"

    def __init__(self):
        super().__init__()
        self.github_service = get_github_service()
        self.template_service = get_template_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Create the project structure with real GitHub integration."""
        self.logger.info("setting_up_project", game_id=str(game.id))

        logs = []
        logs.append(f"Starting project setup for {game.name}")

        try:
            # Check required inputs
            if not game.gdd_spec:
                return {
                    "success": False,
                    "error": "Missing GDD spec from Step 1",
                    "logs": "\n".join(logs),
                }

            # Generate repository name
            repo_name = f"gamefactory-{game.slug}"
            logs.append(f"Repository name: {repo_name}")

            # Create temporary directory for project files
            work_dir = Path(tempfile.mkdtemp(prefix=f"gamefactory_{game.slug}_"))
            project_path = work_dir / repo_name
            logs.append(f"Working directory: {work_dir}")

            # Step 2.1: Create GitHub repository
            logs.append("\n--- Creating GitHub Repository ---")
            github_result = await self._create_github_repo(repo_name, game)

            if not github_result["success"]:
                return {
                    "success": False,
                    "error": f"Failed to create repository: {github_result.get('error', 'Unknown error')}",
                    "logs": "\n".join(logs),
                }

            logs.append(f"✓ Repository created: {github_result['url']}")

            # Step 2.2: Create project structure
            logs.append("\n--- Creating Project Structure ---")
            package_name = f"com.gamefactory.{game.slug.replace('-', '_')}"
            
            structure_result = await self.template_service.create_project_structure(
                target_path=str(project_path),
                game_name=game.name,
                package_name=package_name,
            )

            if not structure_result["success"]:
                return {
                    "success": False,
                    "error": f"Failed to create project structure: {structure_result.get('error', 'Unknown error')}",
                    "logs": "\n".join(logs),
                }

            logs.append(f"✓ Project structure created with {structure_result['files_created']} files")

            # Step 2.3: Clone and integrate Flame template
            logs.append("\n--- Integrating Flame Template ---")
            template_info = self.template_service.get_template_for_genre(game.genre)
            logs.append(f"Selected template: {template_info['repo']} ({template_info['description']})")

            # Clone template to temp location
            template_path = work_dir / "template"
            clone_result = await self.template_service.clone_template(
                genre=game.genre,
                target_path=str(template_path),
            )

            if clone_result["success"]:
                logs.append(f"✓ Template cloned: {len(clone_result.get('files', []))} files")
                # Merge template with project structure
                await self._merge_template(template_path, project_path, game.gdd_spec)
                logs.append("✓ Template merged with project")
            else:
                logs.append(f"⚠ Template clone failed: {clone_result.get('error', 'Unknown')} - using base structure")

            # Step 2.4: Inject GameFactory architecture
            logs.append("\n--- Injecting GameFactory Architecture ---")
            inject_result = await self.template_service.inject_gamefactory_architecture(
                target_path=str(project_path),
                gdd=game.gdd_spec,
            )

            if inject_result["success"]:
                logs.append(f"✓ Architecture injected: {len(inject_result['files_created'])} files")
            else:
                logs.append(f"⚠ Architecture injection failed: {inject_result.get('error', 'Unknown')}")

            # Step 2.5: Push to GitHub
            logs.append("\n--- Pushing to GitHub ---")
            push_result = await self.github_service.push_to_repository(
                repo_name=repo_name,
                local_path=str(project_path),
                commit_message=f"Initial commit: {game.name} - Generated by GameFactory",
            )

            if not push_result["success"]:
                logs.append(f"⚠ Push failed: {push_result.get('error', 'Unknown')}")
                # Continue anyway - repo exists, we'll push later
            else:
                logs.append("✓ Code pushed to repository")

            # Step 2.6: Set up GitHub Actions
            logs.append("\n--- Setting Up CI/CD ---")
            actions_result = await self.github_service.setup_github_actions(repo_name)

            if actions_result["success"]:
                logs.append("✓ GitHub Actions workflow configured")
            else:
                logs.append(f"⚠ GitHub Actions setup failed: {actions_result.get('error', 'Unknown')}")

            # Update game record
            game.github_repo = repo_name
            game.github_repo_url = github_result["url"]
            game.selected_template = template_info["repo"]
            await db.commit()

            logs.append("\n--- Project Setup Complete ---")

            # Validate
            validation = await self.validate(
                db,
                game,
                {
                    "github_repo": repo_name,
                    "github_url": github_result["url"],
                    "template": template_info["repo"],
                    "local_path": str(project_path),
                },
            )

            return {
                "success": validation["valid"],
                "artifacts": {
                    "github_repo": repo_name,
                    "github_url": github_result["url"],
                    "clone_url": github_result.get("clone_url"),
                    "template": template_info["repo"],
                    "local_path": str(project_path),
                    "package_name": package_name,
                },
                "validation": validation,
                "logs": "\n".join(logs),
                "error": validation["errors"][0] if validation["errors"] else None,
            }

        except Exception as e:
            self.logger.exception("project_setup_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    async def _create_github_repo(
        self,
        repo_name: str,
        game: Game,
    ) -> Dict[str, Any]:
        """Create a GitHub repository for the game."""
        description = f"{game.name} - A {game.genre} mobile game generated by GameFactory"
        
        return await self.github_service.create_repository(
            name=repo_name,
            description=description,
            private=False,
            auto_init=True,  # Initialize with README
        )

    async def _merge_template(
        self,
        template_path: Path,
        project_path: Path,
        gdd: Dict[str, Any],
    ):
        """Merge template files with project structure."""
        import shutil

        # Files/directories to copy from template
        merge_items = [
            "lib/game",  # Game code
            "assets",    # Asset files
            "test",      # Test files
        ]

        for item in merge_items:
            src = template_path / item
            dst = project_path / item

            if src.exists():
                if src.is_dir():
                    # Merge directories
                    if dst.exists():
                        shutil.copytree(src, dst, dirs_exist_ok=True)
                    else:
                        shutil.copytree(src, dst)
                else:
                    # Copy file
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate project setup."""
        errors = []
        warnings = []

        # Check repository exists
        if not artifacts.get("github_repo"):
            errors.append("GitHub repository not created")

        if not artifacts.get("github_url"):
            errors.append("GitHub URL not set")

        # Check template was selected
        if not artifacts.get("template"):
            warnings.append("No template selected")

        # Check local project exists
        local_path = artifacts.get("local_path")
        if local_path:
            project_path = Path(local_path)
            
            # Check essential files exist
            essential_files = [
                "pubspec.yaml",
                "lib/main.dart",
                "lib/game/game.dart",
                "lib/services/analytics_service.dart",
            ]

            for file in essential_files:
                if not (project_path / file).exists():
                    warnings.append(f"Missing file: {file}")

        # Note: Flutter analyze runs in GitHub Actions CI, not on backend
        # The backend generates code and pushes to GitHub
        # GitHub Actions workflow validates via flutter analyze during build

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "flutter_analyze": "delegated_to_ci",  # Runs in GitHub Actions build workflow
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback the project setup step."""
        # Note: Would delete GitHub repo in production
        # For safety, we don't auto-delete repos
        
        self.logger.warning(
            "project_setup_rollback",
            game_id=str(game.id),
            message="GitHub repo not auto-deleted for safety",
        )

        game.github_repo = None
        game.github_repo_url = None
        game.selected_template = None
        await db.commit()

        return True
