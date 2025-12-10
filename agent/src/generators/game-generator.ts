/**
 * Game Generator - Orchestrates the creation of a complete game
 */

import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { GameConfig, GameType, GameStatus, WorkflowResult } from '../types/index.js';
import { AIService } from '../services/ai.service.js';
import { GitHubService } from '../services/github.service.js';
import { EASService } from '../services/eas.service.js';
import { ImageService } from '../services/image.service.js';
import { logger } from '../utils/logger.js';

export class GameGenerator {
  private aiService: AIService;
  private githubService: GitHubService;
  private easService: EASService;
  private imageService: ImageService;
  private templatePath: string;
  private outputDir: string;
  private packagePrefix: string;

  constructor(
    aiService: AIService,
    githubService: GitHubService,
    easService: EASService,
    templatePath: string,
    outputDir: string,
    packagePrefix: string = 'com.aigames'
  ) {
    this.aiService = aiService;
    this.githubService = githubService;
    this.easService = easService;
    this.imageService = new ImageService();
    this.templatePath = templatePath;
    this.outputDir = outputDir;
    this.packagePrefix = packagePrefix;
  }

  /**
   * Generate a complete game from concept to repository
   */
  async generateGame(
    name: string,
    type: GameType,
    theme: string,
    mechanics: string[]
  ): Promise<WorkflowResult> {
    const gameId = uuidv4().substring(0, 8);
    const repoName = `game-${gameId}-${type}`;
    const packageName = `${this.packagePrefix}.${type}${gameId.replace(/-/g, '')}`;

    logger.section(`Generating Game: ${name}`);
    logger.info(`Game ID: ${gameId}`);
    logger.info(`Type: ${type}`);
    logger.info(`Theme: ${theme}`);
    logger.info(`Repository: ${repoName}`);

    const config: GameConfig = {
      id: gameId,
      name,
      type,
      theme,
      mechanics,
      packageName,
      repoName,
      status: GameStatus.GENERATING,
      createdAt: new Date()
    };

    try {
      // Step 1: Generate game code with AI
      logger.step(1, 7, 'Generating game code with AI');
      const aiResponse = await this.aiService.generateGame({
        gameType: type,
        theme,
        mechanics,
        levelCount: 3
      });

      // Step 2: Create local project from template
      logger.step(2, 7, 'Creating project from template');
      const localPath = path.join(this.outputDir, repoName);
      await this.createProjectFromTemplate(localPath);

      // Step 3: Apply generated code
      logger.step(3, 7, 'Applying generated code');
      await this.applyGeneratedCode(localPath, aiResponse.code);
      await this.applyGeneratedTests(localPath, aiResponse.tests);

      // Step 4: Generate AI images
      logger.step(4, 8, 'Generating AI images for splash and icon');
      const assetsDir = path.join(localPath, 'assets', 'generated');
      const imageResult = await this.imageService.generateGameAssets({
        name,
        highConcept: `${theme} ${type} game with ${mechanics.join(', ')} mechanics`,
        visualTheme: {
          mood: theme.includes('space') ? 'cosmic' : theme.includes('nature') ? 'peaceful' : 'energetic',
          style: type === 'puzzle' ? 'minimal' : type === 'arcade' ? 'vibrant' : 'modern',
          palette: this.getThemePalette(theme)
        }
      } as any, assetsDir);

      // Step 5: Update configuration files
      logger.step(5, 8, 'Updating configuration');
      await this.updateAppConfig(localPath, name, packageName, imageResult, type);
      await this.addEASConfig(localPath, packageName);

      // Step 6: Create GitHub repository
      logger.step(6, 8, 'Creating GitHub repository');
      const repoUrl = await this.githubService.createRepository({
        name: repoName,
        description: `${name} - ${theme} ${type} game`,
        private: false,
        autoInit: false
      });

      // Step 7: Add GitHub Actions workflow
      logger.step(7, 8, 'Adding CI/CD workflow');
      await this.addCICDWorkflow(localPath);

      // Step 8: Push to GitHub
      logger.step(8, 8, 'Pushing to GitHub');
      await this.githubService.initAndPush(
        localPath,
        repoUrl,
        `feat: initial commit - ${name} game\n\nGenerated ${type} game with theme: ${theme}`
      );

      logger.success(`Game ${name} generated successfully!`);
      logger.info(`Repository: ${repoUrl}`);

      return {
        success: true,
        gameId,
        repoUrl,
        message: `Game ${name} created successfully`
      };
    } catch (error: any) {
      logger.error('Failed to generate game', error);
      return {
        success: false,
        message: 'Game generation failed',
        errors: [error.message]
      };
    }
  }

  /**
   * Create project from template
   */
  private async createProjectFromTemplate(targetPath: string): Promise<void> {
    await fs.ensureDir(targetPath);
    
    if (await fs.pathExists(this.templatePath)) {
      await fs.copy(this.templatePath, targetPath, {
        filter: (src) => {
          // Exclude node_modules and build artifacts
          return !src.includes('node_modules') && 
                 !src.includes('.expo') &&
                 !src.includes('dist');
        }
      });
    } else {
      // Create basic structure if template doesn't exist
      logger.warn('Template not found, creating basic structure');
      await this.createBasicStructure(targetPath);
    }
  }

  /**
   * Create basic project structure
   */
  private async createBasicStructure(projectPath: string): Promise<void> {
    const dirs = [
      'app/screens',
      'app/components/GameEngine',
      'app/config',
      'app/hooks',
      'app/utils',
      '__tests__',
      '.github/workflows'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(path.join(projectPath, dir));
    }

    // Create package.json with SDK 54 compatible dependencies (latest stable)
    const packageJson = {
      name: path.basename(projectPath),
      version: '1.0.0',
      main: 'expo-router/entry',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web',
        test: 'jest',
        lint: 'eslint .'
      },
      dependencies: {
        '@react-native-async-storage/async-storage': '2.1.2',
        'expo': '~54.0.0',
        'expo-constants': '~17.1.0',
        'expo-linking': '~7.1.0',
        'expo-router': '~5.0.0',
        'expo-status-bar': '~2.2.0',
        'react': '19.0.0',
        'react-dom': '19.0.0',
        'react-native': '0.79.2',
        'react-native-gesture-handler': '~2.24.0',
        'react-native-reanimated': '~3.17.0',
        'react-native-safe-area-context': '5.4.0',
        'react-native-screens': '~4.10.0',
        'react-native-web': '~0.20.0'
      },
      devDependencies: {
        '@babel/core': '^7.26.0',
        '@types/react': '~19.0.10',
        'typescript': '~5.8.3',
        'jest': '^29.7.0',
        'jest-expo': '~54.0.0',
        '@testing-library/react-native': '^13.0.0',
        'react-test-renderer': '19.0.0'
      },
      jest: {
        preset: 'jest-expo',
        transformIgnorePatterns: [
          'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
        ]
      },
      private: true
    };

    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

    // Create basic app.json
    await fs.writeJson(path.join(projectPath, 'app.json'), {
      expo: {
        name: 'Game',
        slug: 'game',
        version: '1.0.0',
        orientation: 'portrait',
        userInterfaceStyle: 'dark',
        newArchEnabled: true,
        splash: {
          backgroundColor: '#1a1a2e'
        },
        android: {
          package: 'com.example.game'
        },
        web: {
          bundler: 'metro'
        },
        plugins: ['expo-router'],
        scheme: 'game',
        experiments: {
          typedRoutes: true
        }
      }
    }, { spaces: 2 });

    // Create babel.config.js
    const babelConfig = `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`;
    await fs.writeFile(path.join(projectPath, 'babel.config.js'), babelConfig, 'utf-8');

    // Create .npmrc for legacy peer deps
    await fs.writeFile(path.join(projectPath, '.npmrc'), 'legacy-peer-deps=true\n', 'utf-8');
  }

  /**
   * Apply generated code to project
   */
  private async applyGeneratedCode(projectPath: string, code: Record<string, string>): Promise<void> {
    for (const [filepath, content] of Object.entries(code)) {
      const fullPath = path.join(projectPath, filepath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      logger.debug(`Written: ${filepath}`);
    }
  }

  /**
   * Apply generated tests
   */
  private async applyGeneratedTests(projectPath: string, tests: Record<string, string>): Promise<void> {
    for (const [filepath, content] of Object.entries(tests)) {
      const fullPath = path.join(projectPath, filepath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      logger.debug(`Written test: ${filepath}`);
    }
  }

  /**
   * Update app.json configuration
   */
  private async updateAppConfig(
    projectPath: string,
    name: string,
    packageName: string,
    imageResult: any,
    gameType: string
  ): Promise<void> {
    const appJsonPath = path.join(projectPath, 'app.json');
    const appJson = await fs.readJson(appJsonPath);

    appJson.expo.name = name;
    appJson.expo.slug = name.toLowerCase().replace(/\s+/g, '-');
    appJson.expo.android = appJson.expo.android || {};
    appJson.expo.android.package = packageName;

    // Add AdMob configuration
    appJson.expo.android.config = appJson.expo.android.config || {};
    appJson.expo.android.config.googleMobileAdsAppId = process.env.ADMOB_APP_ID || '';

    // Configure splash screen with generated image
    if (imageResult.splashPath) {
      appJson.expo.splash = {
        image: './assets/generated/splash.png',
        resizeMode: 'cover',
        backgroundColor: '#1a1a2e'
      };
    }

    // Configure icon with generated image
    if (imageResult.iconPath) {
      appJson.expo.icon = './assets/generated/icon.png';
      appJson.expo.android.adaptiveIcon = {
        foregroundImage: './assets/generated/icon.png',
        backgroundColor: '#1a1a2e'
      };
    }

    // Set game type in extra config
    appJson.expo.extra = appJson.expo.extra || {};
    appJson.expo.extra.gameType = gameType;

    await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
  }

  /**
   * Add EAS configuration
   */
  private async addEASConfig(projectPath: string, packageName: string): Promise<void> {
    const easJson = {
      cli: {
        version: '>= 5.0.0'
      },
      build: {
        development: {
          developmentClient: true,
          distribution: 'internal'
        },
        preview: {
          distribution: 'internal',
          android: {
            buildType: 'apk'
          }
        },
        production: {
          android: {
            buildType: 'aab'
          }
        }
      },
      submit: {
        production: {
          android: {
            serviceAccountKeyPath: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH || './google-play-key.json',
            track: 'internal'
          }
        }
      }
    };

    await fs.writeJson(path.join(projectPath, 'eas.json'), easJson, { spaces: 2 });
  }

  /**
   * Get color palette based on theme
   */
  private getThemePalette(theme: string): string[] {
    const themeLower = theme.toLowerCase();
    
    if (themeLower.includes('space') || themeLower.includes('galaxy')) {
      return ['#1a1a2e', '#16213e', '#0f3460', '#e94560'];
    }
    if (themeLower.includes('nature') || themeLower.includes('forest')) {
      return ['#2d5a27', '#4a7c4b', '#8bc34a', '#c8e6c9'];
    }
    if (themeLower.includes('ocean') || themeLower.includes('water')) {
      return ['#006994', '#40a4c8', '#87ceeb', '#e0f7fa'];
    }
    if (themeLower.includes('fire') || themeLower.includes('lava')) {
      return ['#ff5722', '#ff9800', '#ffc107', '#ffeb3b'];
    }
    if (themeLower.includes('cyber') || themeLower.includes('neon')) {
      return ['#0d0221', '#ff00ff', '#00ffff', '#ff6600'];
    }
    if (themeLower.includes('retro') || themeLower.includes('pixel')) {
      return ['#3f2832', '#be4a2f', '#ead4aa', '#4b692f'];
    }
    
    // Default palette
    return ['#1a1a2e', '#16213e', '#0f3460', '#e94560'];
  }

  /**
   * Add CI/CD workflow
   */
  private async addCICDWorkflow(projectPath: string): Promise<void> {
    const workflow = `name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint || true

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: \${{ secrets.EXPO_TOKEN }}

  submit:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas submit --platform android --latest --non-interactive
        env:
          EXPO_TOKEN: \${{ secrets.EXPO_TOKEN }}
`;

    await this.githubService.addWorkflowFile(projectPath, workflow);
  }
}
