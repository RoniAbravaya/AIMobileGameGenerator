/**
 * Main Orchestrator - Coordinates all services for game generation and management
 */

import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import { GameType, GameConfig, GameStatus, WorkflowResult, ExtensionRequest } from './types/index.js';
import { AIService } from './services/ai.service.js';
import { GitHubService } from './services/github.service.js';
import { EASService } from './services/eas.service.js';
import { GooglePlayService } from './services/googleplay.service.js';
import { AnalyticsService } from './services/analytics.service.js';
import { GameGenerator } from './generators/game-generator.js';
import { logger } from './utils/logger.js';
import { getConfig } from './utils/config.js';

export class Orchestrator {
  private aiService: AIService;
  private githubService: GitHubService;
  private easService: EASService;
  private googlePlayService: GooglePlayService;
  private analyticsService: AnalyticsService;
  private gameGenerator: GameGenerator;
  private config: ReturnType<typeof getConfig>;
  private gamesDbPath: string;

  constructor() {
    this.config = getConfig();
    
    // Initialize services
    this.aiService = new AIService(this.config.anthropicApiKey);
    this.githubService = new GitHubService(this.config.githubToken, this.config.githubOrg);
    this.easService = new EASService(this.config.expoToken);
    this.googlePlayService = new GooglePlayService(this.config.googlePlayServiceAccountPath);
    this.analyticsService = new AnalyticsService(this.googlePlayService);
    
    // Initialize game generator
    const templatePath = path.resolve(process.cwd(), '../game-template');
    this.gameGenerator = new GameGenerator(
      this.aiService,
      this.githubService,
      this.easService,
      templatePath,
      this.config.generatedGamesDir,
      process.env.GOOGLE_PLAY_PACKAGE_PREFIX || 'com.aigames'
    );

    this.gamesDbPath = path.join(this.config.generatedGamesDir, 'games.json');
  }

  /**
   * Generate a new game
   */
  async generateGame(
    name: string,
    type: GameType,
    theme: string,
    mechanics: string[]
  ): Promise<WorkflowResult> {
    const spinner = ora('Generating game...').start();

    try {
      const result = await this.gameGenerator.generateGame(name, type, theme, mechanics);
      
      if (result.success && result.gameId) {
        // Save game config to database
        await this.saveGameConfig({
          id: result.gameId,
          name,
          type,
          theme,
          mechanics,
          packageName: `com.aigames.${type}${result.gameId}`,
          repoName: `game-${result.gameId}-${type}`,
          status: GameStatus.TESTING,
          createdAt: new Date()
        });
      }

      spinner.succeed(result.message);
      return result;
    } catch (error: any) {
      spinner.fail('Game generation failed');
      logger.error('Generation error', error);
      return {
        success: false,
        message: 'Game generation failed',
        errors: [error.message]
      };
    }
  }

  /**
   * Deploy a game to Google Play
   */
  async deployGame(gameId: string): Promise<WorkflowResult> {
    const spinner = ora('Deploying game...').start();

    try {
      const gameConfig = await this.getGameConfig(gameId);
      if (!gameConfig) {
        throw new Error(`Game ${gameId} not found`);
      }

      const gamePath = path.join(this.config.generatedGamesDir, gameConfig.repoName);

      // Step 1: Run tests
      spinner.text = 'Running tests...';
      const testResult = await this.easService.runTests(gamePath);
      
      if (!testResult.success) {
        spinner.fail('Tests failed');
        
        // Attempt to fix with AI
        if (this.config.maxRetryAttempts > 0) {
          spinner.text = 'Attempting to fix test failures...';
          await this.attemptFix(gamePath, testResult.logs || '');
          
          // Retry tests
          const retryResult = await this.easService.runTests(gamePath);
          if (!retryResult.success) {
            throw new Error('Tests failed after fix attempt');
          }
        } else {
          throw new Error('Tests failed');
        }
      }

      spinner.succeed('Tests passed');

      // Step 2: Build
      spinner.text = 'Building Android app...';
      const buildResult = await this.easService.buildAndroid(gamePath);
      
      if (!buildResult.success) {
        spinner.fail('Build failed');
        throw new Error('Build failed: ' + (buildResult.errors?.join(', ') || 'Unknown error'));
      }

      spinner.succeed('Build completed');

      // Step 3: Submit to Google Play
      spinner.text = 'Submitting to Google Play...';
      const deployResult = await this.easService.submitToGooglePlay(gamePath);
      
      if (!deployResult.success) {
        spinner.fail('Submission failed');
        throw new Error('Submission failed: ' + (deployResult.errors?.join(', ') || 'Unknown error'));
      }

      spinner.succeed('Game deployed to Google Play');

      // Update game status
      gameConfig.status = GameStatus.LIVE;
      gameConfig.deployedAt = new Date();
      await this.saveGameConfig(gameConfig);

      return {
        success: true,
        gameId,
        buildUrl: buildResult.buildUrl,
        message: `Game ${gameConfig.name} deployed successfully`
      };
    } catch (error: any) {
      spinner.fail('Deployment failed');
      logger.error('Deployment error', error);
      return {
        success: false,
        message: 'Deployment failed',
        errors: [error.message]
      };
    }
  }

  /**
   * Analyze performance of all games and select winner
   */
  async analyzePerformance(days: number = 30): Promise<void> {
    const spinner = ora('Analyzing game performance...').start();

    try {
      const games = await this.getAllGames();
      const liveGames = games.filter(g => g.status === GameStatus.LIVE);

      if (liveGames.length === 0) {
        spinner.warn('No live games to analyze');
        return;
      }

      const gameConfigs = liveGames.map(g => ({
        id: g.id,
        packageName: g.packageName
      }));

      const analysis = await this.analyticsService.analyzeGames(gameConfigs);

      // Export analysis
      const reportPath = path.join(
        this.config.generatedGamesDir,
        `analysis-${new Date().toISOString().split('T')[0]}.json`
      );
      await this.analyticsService.exportAnalysis(analysis, reportPath);

      spinner.succeed('Analysis complete');

      if (analysis.winner) {
        logger.success(`\nWinner: ${analysis.winner.gameId}`);
        logger.info(`Score: ${analysis.winner.score}`);
        logger.info(`\nNext steps:`);
        logger.info(`  1. Run: npm run extend -- --game ${analysis.winner.gameId} --levels 10`);
        logger.info(`  2. Run: npm run sunset -- --exclude ${analysis.winner.gameId}`);
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      logger.error('Analysis error', error);
    }
  }

  /**
   * Extend a game with additional levels
   */
  async extendGame(request: ExtensionRequest): Promise<WorkflowResult> {
    const spinner = ora('Extending game...').start();

    try {
      const gameConfig = await this.getGameConfig(request.gameId);
      if (!gameConfig) {
        throw new Error(`Game ${request.gameId} not found`);
      }

      const gamePath = path.join(this.config.generatedGamesDir, gameConfig.repoName);

      // Read existing levels
      const levelsPath = path.join(gamePath, 'app', 'config', 'levels.ts');
      const levelsContent = await fs.readFile(levelsPath, 'utf-8');
      
      // Extract existing levels (simplified)
      const levelsMatch = levelsContent.match(/export const LEVELS[:\s]*=\s*(\[[\s\S]+?\]);/);
      let existingLevels = [];
      if (levelsMatch) {
        try {
          existingLevels = eval(levelsMatch[1]);
        } catch (error) {
          logger.warn('Could not parse existing levels');
        }
      }

      spinner.text = 'Generating new levels...';
      const newLevels = await this.aiService.generateLevels(
        gameConfig.type,
        existingLevels,
        request.additionalLevels
      );

      // Update levels file
      const allLevels = [...existingLevels, ...newLevels];
      const updatedContent = levelsContent.replace(
        /export const LEVELS[:\s]*=\s*\[[\s\S]+?\];/,
        `export const LEVELS = ${JSON.stringify(allLevels, null, 2)};`
      );

      await fs.writeFile(levelsPath, updatedContent, 'utf-8');

      // Create a new branch
      await this.githubService.createBranch(gamePath, `feature/add-${request.additionalLevels}-levels`);

      // Commit and push
      await this.githubService.commitAndPush(
        gamePath,
        `feat: add ${request.additionalLevels} new levels\n\nExtended game with additional content`
      );

      // Create pull request
      const prUrl = await this.githubService.createPullRequest(
        gameConfig.repoName,
        `Add ${request.additionalLevels} New Levels`,
        `## Summary\n- Added ${request.additionalLevels} new levels\n- Progressive difficulty\n- New challenges\n\n## Review Required\nPlease test the new levels before merging.`,
        `feature/add-${request.additionalLevels}-levels`
      );

      spinner.succeed('Game extended successfully');
      logger.info(`Pull Request: ${prUrl}`);

      return {
        success: true,
        gameId: request.gameId,
        message: `Extended ${gameConfig.name} with ${request.additionalLevels} levels`,
        repoUrl: prUrl
      };
    } catch (error: any) {
      spinner.fail('Extension failed');
      logger.error('Extension error', error);
      return {
        success: false,
        message: 'Extension failed',
        errors: [error.message]
      };
    }
  }

  /**
   * Sunset (archive) games except the winner
   */
  async sunsetGames(excludeGameId?: string): Promise<void> {
    const spinner = ora('Sunsetting games...').start();

    try {
      const games = await this.getAllGames();
      const gamesToSunset = excludeGameId
        ? games.filter(g => g.id !== excludeGameId && g.status === GameStatus.LIVE)
        : games.filter(g => g.status === GameStatus.LIVE);

      for (const game of gamesToSunset) {
        spinner.text = `Sunsetting ${game.name}...`;
        
        // Archive GitHub repo
        await this.githubService.archiveRepository(game.repoName);
        
        // Update status
        game.status = GameStatus.SUNSET;
        await this.saveGameConfig(game);
        
        logger.info(`✓ Sunset ${game.name}`);
      }

      spinner.succeed(`Sunset ${gamesToSunset.length} games`);
    } catch (error) {
      spinner.fail('Sunset operation failed');
      logger.error('Sunset error', error);
    }
  }

  /**
   * Attempt to fix failing tests/builds using AI
   */
  private async attemptFix(projectPath: string, errorLogs: string): Promise<void> {
    logger.info('Attempting AI-powered fix...');

    // Read relevant files
    const filesToRead = [
      'app/screens/GameScreen.tsx',
      'app/components/GameEngine/GameEngine.tsx',
      '__tests__/game-logic.test.ts'
    ];

    const fileContents: Record<string, string> = {};
    for (const file of filesToRead) {
      const fullPath = path.join(projectPath, file);
      if (await fs.pathExists(fullPath)) {
        fileContents[file] = await fs.readFile(fullPath, 'utf-8');
      }
    }

    // Get fixes from AI
    const fixes = await this.aiService.generateFix(errorLogs, fileContents);

    // Apply fixes
    for (const [filepath, content] of Object.entries(fixes)) {
      const fullPath = path.join(projectPath, filepath);
      await fs.writeFile(fullPath, content, 'utf-8');
      logger.info(`Applied fix to ${filepath}`);
    }

    // Commit fixes
    await this.githubService.commitAndPush(projectPath, 'fix: automated test/build fixes');
  }

  /**
   * Save game configuration to database
   */
  private async saveGameConfig(config: GameConfig): Promise<void> {
    await fs.ensureDir(path.dirname(this.gamesDbPath));
    
    let games: GameConfig[] = [];
    if (await fs.pathExists(this.gamesDbPath)) {
      games = await fs.readJson(this.gamesDbPath);
    }

    const index = games.findIndex(g => g.id === config.id);
    if (index >= 0) {
      games[index] = config;
    } else {
      games.push(config);
    }

    await fs.writeJson(this.gamesDbPath, games, { spaces: 2 });
  }

  /**
   * Get game configuration
   */
  private async getGameConfig(gameId: string): Promise<GameConfig | null> {
    if (!(await fs.pathExists(this.gamesDbPath))) {
      return null;
    }

    const games: GameConfig[] = await fs.readJson(this.gamesDbPath);
    return games.find(g => g.id === gameId) || null;
  }

  /**
   * Get all games
   */
  private async getAllGames(): Promise<GameConfig[]> {
    if (!(await fs.pathExists(this.gamesDbPath))) {
      return [];
    }

    return await fs.readJson(this.gamesDbPath);
  }

  /**
   * List all games
   */
  async listGames(): Promise<void> {
    const games = await this.getAllGames();

    if (games.length === 0) {
      logger.info('No games generated yet');
      return;
    }

    logger.section('Generated Games');
    console.log('\nID       | Name                  | Type       | Status     | Created');
    console.log('─'.repeat(80));

    games.forEach(game => {
      const id = game.id.padEnd(8);
      const name = game.name.padEnd(22);
      const type = game.type.padEnd(10);
      const status = game.status.padEnd(10);
      const created = new Date(game.createdAt).toLocaleDateString();

      console.log(`${id} | ${name} | ${type} | ${status} | ${created}`);
    });

    console.log('\n');
  }
}
