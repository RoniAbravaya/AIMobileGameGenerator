/**
 * GitHub Service - Manages GitHub repositories, commits, and pushes
 */

import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { GitHubRepoConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;

  constructor(token: string, owner: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
  }

  /**
   * Create a new GitHub repository
   * Tries to create in organization first, falls back to personal account
   */
  async createRepository(config: GitHubRepoConfig): Promise<string> {
    logger.info(`Creating GitHub repository: ${config.name}`);

    try {
      let response;
      
      // First, try to create in the organization (if owner is an org)
      try {
        response = await this.octokit.repos.createInOrg({
          org: this.owner,
          name: config.name,
          description: config.description,
          private: config.private,
          auto_init: config.autoInit
        });
        logger.success(`Repository created in org ${this.owner}: ${response.data.html_url}`);
      } catch (orgError: any) {
        // If org creation fails (e.g., owner is a user, not an org), try personal account
        if (orgError.status === 404 || orgError.message?.includes('Not Found')) {
          logger.info('Organization not found, creating in personal account');
          response = await this.octokit.repos.createForAuthenticatedUser({
            name: config.name,
            description: config.description,
            private: config.private,
            auto_init: config.autoInit
          });
          logger.success(`Repository created: ${response.data.html_url}`);
        } else {
          throw orgError;
        }
      }

      return response.data.clone_url;
    } catch (error: any) {
      if (error.status === 422) {
        logger.warn('Repository already exists, fetching existing repo');
        return await this.getRepositoryUrl(config.name);
      }
      logger.error('Failed to create repository', error);
      throw error;
    }
  }

  /**
   * Get repository URL
   */
  async getRepositoryUrl(repoName: string): Promise<string> {
    try {
      const response = await this.octokit.repos.get({
        owner: this.owner,
        repo: repoName
      });
      return response.data.clone_url;
    } catch (error) {
      logger.error(`Failed to get repository: ${repoName}`, error);
      throw error;
    }
  }

  /**
   * Clone repository to local directory
   */
  async cloneRepository(repoUrl: string, localPath: string): Promise<void> {
    logger.info(`Cloning repository to ${localPath}`);

    try {
      await fs.ensureDir(path.dirname(localPath));
      const git = simpleGit();
      await git.clone(repoUrl, localPath);
      logger.success('Repository cloned successfully');
    } catch (error) {
      logger.error('Failed to clone repository', error);
      throw error;
    }
  }

  /**
   * Initialize git in a directory and push to remote
   */
  async initAndPush(localPath: string, repoUrl: string, commitMessage: string): Promise<void> {
    logger.info('Initializing git and pushing to remote');

    try {
      // Remove any existing .git folder to ensure this is a fresh repo
      // (in case it inherited from parent directory)
      const existingGitDir = path.join(localPath, '.git');
      if (await fs.pathExists(existingGitDir)) {
        await fs.remove(existingGitDir);
      }

      const git: SimpleGit = simpleGit(localPath);
      
      // Initialize fresh git repo
      await git.init();

      // Configure git user for this repo (use env vars or defaults)
      const gitEmail = process.env.GIT_USER_EMAIL || 'ai-game-generator@example.com';
      const gitName = process.env.GIT_USER_NAME || 'AI Game Generator';
      await git.addConfig('user.email', gitEmail, false, 'local');
      await git.addConfig('user.name', gitName, false, 'local');

      // Configure git to use the token for HTTPS authentication
      const gitToken = process.env.GIT_TOKEN;
      if (gitToken) {
        await git.addConfig('credential.helper', 'store', false, 'local');
        // Store credentials for this remote
        const credsFile = path.join(process.env.HOME || '~', '.git-credentials');
        const credsUrl = `https://${this.owner}:${gitToken}@github.com`;
        await fs.ensureFile(credsFile);
        await fs.writeFile(credsFile, credsUrl, { mode: 0o600 });
      }

      // Set default branch to main
      await git.branch(['-M', 'main']);

      // Add remote with token embedded in URL for HTTPS auth
      let authenticatedUrl = repoUrl;
      if (gitToken && repoUrl.startsWith('https://')) {
        authenticatedUrl = repoUrl.replace('https://', `https://${this.owner}:${gitToken}@`);
      }
      await git.addRemote('origin', authenticatedUrl);

      // Stage all files using --force to bypass parent .gitignore
      await git.raw(['add', '--force', '.']);

      // Commit
      await git.commit(commitMessage);

      // Push to main branch
      await git.push('origin', 'main', ['--set-upstream']);

      logger.success('Code pushed to GitHub successfully');
    } catch (error) {
      logger.error('Failed to push to GitHub', error);
      throw error;
    }
  }

  /**
   * Commit and push changes
   */
  async commitAndPush(localPath: string, commitMessage: string): Promise<void> {
    logger.info('Committing and pushing changes');

    try {
      const git: SimpleGit = simpleGit(localPath);
      
      await git.add('.');
      await git.commit(commitMessage);
      await git.push();

      logger.success('Changes pushed successfully');
    } catch (error) {
      logger.error('Failed to commit and push', error);
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    repoName: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<string> {
    logger.info(`Creating pull request: ${title}`);

    try {
      const response = await this.octokit.pulls.create({
        owner: this.owner,
        repo: repoName,
        title,
        body,
        head,
        base
      });

      logger.success(`Pull request created: ${response.data.html_url}`);
      return response.data.html_url;
    } catch (error) {
      logger.error('Failed to create pull request', error);
      throw error;
    }
  }

  /**
   * Add GitHub Actions workflow file
   */
  async addWorkflowFile(localPath: string, workflowContent: string): Promise<void> {
    logger.info('Adding GitHub Actions workflow');

    try {
      const workflowPath = path.join(localPath, '.github', 'workflows', 'ci.yml');
      await fs.ensureDir(path.dirname(workflowPath));
      await fs.writeFile(workflowPath, workflowContent, 'utf-8');
      logger.success('Workflow file created');
    } catch (error) {
      logger.error('Failed to create workflow file', error);
      throw error;
    }
  }

  /**
   * Add secrets to repository
   */
  async addSecret(repoName: string, secretName: string, secretValue: string): Promise<void> {
    logger.info(`Adding secret: ${secretName} to ${repoName}`);

    try {
      // Get public key for the repository
      const { data: publicKey } = await this.octokit.actions.getRepoPublicKey({
        owner: this.owner,
        repo: repoName
      });

      // Encrypt the secret (simplified - in production use libsodium)
      const encryptedValue = Buffer.from(secretValue).toString('base64');

      await this.octokit.actions.createOrUpdateRepoSecret({
        owner: this.owner,
        repo: repoName,
        secret_name: secretName,
        encrypted_value: encryptedValue,
        key_id: publicKey.key_id
      });

      logger.success(`Secret ${secretName} added successfully`);
    } catch (error) {
      logger.error(`Failed to add secret: ${secretName}`, error);
      throw error;
    }
  }

  /**
   * Archive (sunset) a repository
   */
  async archiveRepository(repoName: string): Promise<void> {
    logger.info(`Archiving repository: ${repoName}`);

    try {
      await this.octokit.repos.update({
        owner: this.owner,
        repo: repoName,
        archived: true
      });

      logger.success(`Repository ${repoName} archived`);
    } catch (error) {
      logger.error('Failed to archive repository', error);
      throw error;
    }
  }

  /**
   * Check if repository exists
   */
  async repositoryExists(repoName: string): Promise<boolean> {
    try {
      await this.octokit.repos.get({
        owner: this.owner,
        repo: repoName
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a branch
   */
  async createBranch(localPath: string, branchName: string): Promise<void> {
    logger.info(`Creating branch: ${branchName}`);

    try {
      const git: SimpleGit = simpleGit(localPath);
      await git.checkoutLocalBranch(branchName);
      logger.success(`Branch ${branchName} created`);
    } catch (error) {
      logger.error('Failed to create branch', error);
      throw error;
    }
  }
}
