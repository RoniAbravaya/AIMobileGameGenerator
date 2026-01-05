"""
GitHub Service

Provides full GitHub integration for repository management:
- Creating repositories
- Cloning templates
- Committing and pushing code
- Managing releases and workflows
"""

import asyncio
import base64
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import structlog
import github
from github import Github, GithubException, InputGitTreeElement
from github.Repository import Repository

from app.core.config import settings

logger = structlog.get_logger()


class GitHubService:
    """
    Service for GitHub repository operations.
    
    Handles all GitHub API interactions including repo creation,
    file management, and CI/CD workflow triggers.
    """

    def __init__(self):
        self.github: Optional[Github] = None
        self.token = settings.github_token
        self.org = settings.github_org
        self._initialize_client()

    def _initialize_client(self):
        """Initialize GitHub client."""
        if self.token:
            self.github = Github(self.token)
            logger.info("github_client_initialized", org=self.org)
        else:
            logger.warning("github_token_not_set", 
                          message="GitHub operations will fail without token")

    def _ensure_client(self):
        """Ensure GitHub client is available."""
        if not self.github:
            raise ValueError(
                "GitHub client not initialized. Set GITHUB_TOKEN environment variable."
            )

    async def create_repository(
        self,
        name: str,
        description: str,
        private: bool = False,
        auto_init: bool = False,
    ) -> Dict[str, Any]:
        """
        Create a new GitHub repository.
        
        Args:
            name: Repository name
            description: Repository description
            private: Whether repo should be private
            auto_init: Initialize with README
        
        Returns:
            Repository information dict
        """
        self._ensure_client()

        try:
            # Try organization first, fall back to user
            try:
                owner = self.github.get_organization(self.org)
                logger.info("using_organization", org=self.org)
            except GithubException:
                owner = self.github.get_user()
                logger.info("using_user_account", user=owner.login)

            # Create repository
            repo = owner.create_repo(
                name=name,
                description=description,
                private=private,
                auto_init=auto_init,
                has_issues=True,
                has_wiki=False,
                has_downloads=True,
            )

            logger.info(
                "repository_created",
                repo=repo.full_name,
                url=repo.html_url,
            )

            return {
                "success": True,
                "name": repo.name,
                "full_name": repo.full_name,
                "url": repo.html_url,
                "clone_url": repo.clone_url,
                "ssh_url": repo.ssh_url,
                "default_branch": repo.default_branch,
            }

        except GithubException as e:
            logger.error("repository_creation_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def clone_template(
        self,
        template_repo: str,
        target_path: str,
    ) -> Dict[str, Any]:
        """
        Clone a template repository to local path.
        
        Args:
            template_repo: Template repo in format "owner/repo"
            target_path: Local path to clone to
        
        Returns:
            Clone result information
        """
        self._ensure_client()

        try:
            # Get template repository
            template = self.github.get_repo(template_repo)
            clone_url = template.clone_url
            
            # If we have a token, use it for authentication
            if self.token:
                clone_url = clone_url.replace(
                    "https://",
                    f"https://{self.token}@"
                )

            # Create target directory
            target = Path(target_path)
            if target.exists():
                shutil.rmtree(target)
            target.mkdir(parents=True, exist_ok=True)

            # Clone using git command (async)
            process = await asyncio.create_subprocess_exec(
                "git", "clone", "--depth", "1", clone_url, str(target),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error("clone_failed", error=error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                }

            # Remove .git directory to start fresh
            git_dir = target / ".git"
            if git_dir.exists():
                shutil.rmtree(git_dir)

            logger.info(
                "template_cloned",
                template=template_repo,
                target=str(target),
            )

            return {
                "success": True,
                "path": str(target),
                "template": template_repo,
                "files": list(target.rglob("*")),
            }

        except GithubException as e:
            logger.error("clone_template_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def push_to_repository(
        self,
        repo_name: str,
        local_path: str,
        commit_message: str = "Initial commit from GameFactory",
        branch: str = "main",
    ) -> Dict[str, Any]:
        """
        Push local files to a GitHub repository.
        
        Args:
            repo_name: Target repository name
            local_path: Local path with files to push
            commit_message: Commit message
            branch: Target branch
        
        Returns:
            Push result information
        """
        self._ensure_client()

        try:
            # Get the repository
            try:
                repo = self.github.get_repo(f"{self.org}/{repo_name}")
            except GithubException:
                # Try user account
                user = self.github.get_user()
                repo = self.github.get_repo(f"{user.login}/{repo_name}")

            local = Path(local_path)
            
            # Initialize git in local path
            await self._run_git_command(["init"], cwd=local)
            await self._run_git_command(["checkout", "-b", branch], cwd=local)
            
            # Configure git
            await self._run_git_command(
                ["config", "user.email", "gamefactory@automated.build"],
                cwd=local
            )
            await self._run_git_command(
                ["config", "user.name", "GameFactory Bot"],
                cwd=local
            )

            # Add all files
            await self._run_git_command(["add", "-A"], cwd=local)
            
            # Commit
            await self._run_git_command(
                ["commit", "-m", commit_message],
                cwd=local
            )

            # Add remote with token
            remote_url = f"https://{self.token}@github.com/{repo.full_name}.git"
            await self._run_git_command(
                ["remote", "add", "origin", remote_url],
                cwd=local
            )

            # Push
            result = await self._run_git_command(
                ["push", "-u", "origin", branch, "--force"],
                cwd=local
            )

            logger.info(
                "pushed_to_repository",
                repo=repo.full_name,
                branch=branch,
            )

            return {
                "success": True,
                "repo": repo.full_name,
                "branch": branch,
                "url": repo.html_url,
            }

        except Exception as e:
            logger.error("push_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def _run_git_command(
        self,
        args: List[str],
        cwd: Path,
    ) -> Dict[str, Any]:
        """Run a git command asynchronously."""
        process = await asyncio.create_subprocess_exec(
            "git", *args,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        
        return {
            "returncode": process.returncode,
            "stdout": stdout.decode() if stdout else "",
            "stderr": stderr.decode() if stderr else "",
        }

    async def create_file(
        self,
        repo_name: str,
        file_path: str,
        content: str,
        commit_message: str,
        branch: str = "main",
    ) -> Dict[str, Any]:
        """
        Create or update a file in a repository.
        
        Args:
            repo_name: Repository name
            file_path: Path within repository
            content: File content
            commit_message: Commit message
            branch: Target branch
        
        Returns:
            File creation result
        """
        self._ensure_client()

        try:
            repo = self._get_repo(repo_name)
            
            # Check if file exists
            try:
                existing = repo.get_contents(file_path, ref=branch)
                # Update existing file
                result = repo.update_file(
                    file_path,
                    commit_message,
                    content,
                    existing.sha,
                    branch=branch,
                )
                action = "updated"
            except GithubException:
                # Create new file
                result = repo.create_file(
                    file_path,
                    commit_message,
                    content,
                    branch=branch,
                )
                action = "created"

            logger.info(
                f"file_{action}",
                repo=repo_name,
                path=file_path,
            )

            return {
                "success": True,
                "action": action,
                "path": file_path,
                "sha": result["content"].sha,
            }

        except GithubException as e:
            logger.error("file_operation_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def create_multiple_files(
        self,
        repo_name: str,
        files: Dict[str, str],
        commit_message: str,
        branch: str = "main",
    ) -> Dict[str, Any]:
        """
        Create multiple files in a single commit using Git Data API.
        
        Args:
            repo_name: Repository name
            files: Dict of {file_path: content}
            commit_message: Commit message
            branch: Target branch
        
        Returns:
            Operation result
        """
        self._ensure_client()

        try:
            repo = self._get_repo(repo_name)
            
            # Get the current commit SHA
            ref = repo.get_git_ref(f"heads/{branch}")
            current_sha = ref.object.sha
            current_commit = repo.get_git_commit(current_sha)
            base_tree = current_commit.tree

            # Create tree elements for each file
            tree_elements = []
            for path, content in files.items():
                blob = repo.create_git_blob(content, "utf-8")
                tree_elements.append(
                    InputGitTreeElement(
                        path=path,
                        mode="100644",
                        type="blob",
                        sha=blob.sha,
                    )
                )

            # Create new tree
            new_tree = repo.create_git_tree(tree_elements, base_tree)

            # Create commit
            new_commit = repo.create_git_commit(
                commit_message,
                new_tree,
                [current_commit],
            )

            # Update reference
            ref.edit(new_commit.sha)

            logger.info(
                "multiple_files_created",
                repo=repo_name,
                file_count=len(files),
                commit=new_commit.sha,
            )

            return {
                "success": True,
                "commit_sha": new_commit.sha,
                "files_created": len(files),
            }

        except GithubException as e:
            logger.error("multi_file_creation_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    def _get_repo(self, repo_name: str) -> Repository:
        """Get repository by name, trying org then user."""
        try:
            return self.github.get_repo(f"{self.org}/{repo_name}")
        except GithubException:
            user = self.github.get_user()
            return self.github.get_repo(f"{user.login}/{repo_name}")

    async def trigger_workflow(
        self,
        repo_name: str,
        workflow_id: str,
        ref: str = "main",
        inputs: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Trigger a GitHub Actions workflow.
        
        Args:
            repo_name: Repository name
            workflow_id: Workflow filename or ID
            ref: Git reference (branch/tag)
            inputs: Workflow inputs
        
        Returns:
            Workflow dispatch result
        """
        self._ensure_client()

        try:
            repo = self._get_repo(repo_name)
            workflow = repo.get_workflow(workflow_id)
            
            success = workflow.create_dispatch(ref, inputs or {})

            logger.info(
                "workflow_triggered",
                repo=repo_name,
                workflow=workflow_id,
                ref=ref,
            )

            return {
                "success": success,
                "workflow": workflow_id,
                "ref": ref,
            }

        except GithubException as e:
            logger.error("workflow_trigger_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def get_workflow_runs(
        self,
        repo_name: str,
        workflow_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get recent workflow runs.
        
        Args:
            repo_name: Repository name
            workflow_id: Optional workflow ID to filter
            limit: Maximum runs to return
        
        Returns:
            List of workflow run information
        """
        self._ensure_client()

        try:
            repo = self._get_repo(repo_name)
            
            if workflow_id:
                workflow = repo.get_workflow(workflow_id)
                runs = workflow.get_runs()
            else:
                runs = repo.get_workflow_runs()

            result = []
            for run in runs[:limit]:
                result.append({
                    "id": run.id,
                    "name": run.name,
                    "status": run.status,
                    "conclusion": run.conclusion,
                    "created_at": run.created_at.isoformat(),
                    "updated_at": run.updated_at.isoformat(),
                    "url": run.html_url,
                })

            return result

        except GithubException as e:
            logger.error("get_workflow_runs_failed", error=str(e))
            return []

    async def create_release(
        self,
        repo_name: str,
        tag: str,
        name: str,
        body: str,
        draft: bool = False,
        prerelease: bool = False,
    ) -> Dict[str, Any]:
        """
        Create a GitHub release.
        
        Args:
            repo_name: Repository name
            tag: Release tag
            name: Release name
            body: Release description
            draft: Create as draft
            prerelease: Mark as pre-release
        
        Returns:
            Release information
        """
        self._ensure_client()

        try:
            repo = self._get_repo(repo_name)
            
            release = repo.create_git_release(
                tag=tag,
                name=name,
                message=body,
                draft=draft,
                prerelease=prerelease,
            )

            logger.info(
                "release_created",
                repo=repo_name,
                tag=tag,
            )

            return {
                "success": True,
                "id": release.id,
                "tag": release.tag_name,
                "url": release.html_url,
            }

        except GithubException as e:
            logger.error("release_creation_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def upload_release_asset(
        self,
        repo_name: str,
        release_id: int,
        asset_path: str,
        asset_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload an asset to a release.
        
        Args:
            repo_name: Repository name
            release_id: Release ID
            asset_path: Local path to asset
            asset_name: Name for the asset (defaults to filename)
        
        Returns:
            Asset upload result
        """
        self._ensure_client()

        try:
            repo = self._get_repo(repo_name)
            release = repo.get_release(release_id)
            
            asset_path = Path(asset_path)
            name = asset_name or asset_path.name

            asset = release.upload_asset(str(asset_path), name=name)

            logger.info(
                "asset_uploaded",
                repo=repo_name,
                release=release_id,
                asset=name,
            )

            return {
                "success": True,
                "id": asset.id,
                "name": asset.name,
                "url": asset.browser_download_url,
            }

        except GithubException as e:
            logger.error("asset_upload_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def setup_github_actions(
        self,
        repo_name: str,
    ) -> Dict[str, Any]:
        """
        Set up GitHub Actions workflow for Flutter builds.
        
        Args:
            repo_name: Repository name
        
        Returns:
            Setup result
        """
        workflow_content = """name: Build Android

on:
  push:
    branches: [main]
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
          channel: 'stable'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run tests
        run: flutter test
      
      - name: Build APK
        run: flutter build apk --release
      
      - name: Build AAB
        run: flutter build appbundle --release
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: release-apk
          path: build/app/outputs/flutter-apk/app-release.apk
      
      - name: Upload AAB
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: build/app/outputs/bundle/release/app-release.aab
      
      - name: Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            build/app/outputs/flutter-apk/app-release.apk
            build/app/outputs/bundle/release/app-release.aab
"""

        return await self.create_file(
            repo_name,
            ".github/workflows/build.yml",
            workflow_content,
            "Add GitHub Actions build workflow",
        )


# Singleton instance
_github_service: Optional[GitHubService] = None


def get_github_service() -> GitHubService:
    """Get or create the GitHub service singleton."""
    global _github_service
    if _github_service is None:
        _github_service = GitHubService()
    return _github_service
