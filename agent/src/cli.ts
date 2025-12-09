#!/usr/bin/env node

/**
 * CLI Interface for AI Game Generator Agent
 */

import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import { Orchestrator } from './orchestrator.js';
import { GameType } from './types/index.js';
import { logger } from './utils/logger.js';
import { validateConfig } from './utils/config.js';

const program = new Command();

program
  .name('ai-game-generator')
  .description('AI-powered mobile game generation and deployment system')
  .version('1.0.0');

/**
 * Generate a new game
 */
program
  .command('generate-game')
  .description('Generate a new mobile game')
  .option('-n, --name <name>', 'Game name')
  .option('-t, --type <type>', 'Game type (runner, platformer, puzzle, etc.)')
  .option('--theme <theme>', 'Game theme')
  .option('-m, --mechanics <mechanics>', 'Game mechanics (comma-separated)')
  .option('--interactive', 'Interactive mode with prompts', false)
  .action(async (options) => {
    try {
      if (!validateConfig()) {
        process.exit(1);
      }

      let { name, type, theme, mechanics } = options;

      // Interactive mode
      if (options.interactive || !name || !type || !theme) {
        const responses = await prompts([
          {
            type: 'text',
            name: 'name',
            message: 'Game name:',
            initial: name || 'My Awesome Game'
          },
          {
            type: 'select',
            name: 'type',
            message: 'Game type:',
            choices: Object.values(GameType).map(t => ({ title: t, value: t })),
            initial: type ? Object.values(GameType).indexOf(type as GameType) : 0
          },
          {
            type: 'text',
            name: 'theme',
            message: 'Game theme:',
            initial: theme || 'Space adventure'
          },
          {
            type: 'text',
            name: 'mechanics',
            message: 'Game mechanics (comma-separated):',
            initial: mechanics || 'jump, collect, avoid obstacles'
          }
        ]);

        name = responses.name;
        type = responses.type;
        theme = responses.theme;
        mechanics = responses.mechanics;
      }

      const mechanicsArray = typeof mechanics === 'string'
        ? mechanics.split(',').map(m => m.trim())
        : mechanics;

      console.log(chalk.cyan('\n🎮 Starting game generation...\n'));

      const orchestrator = new Orchestrator();
      const result = await orchestrator.generateGame(name, type as GameType, theme, mechanicsArray);

      if (result.success) {
        console.log(chalk.green.bold('\n✅ SUCCESS!\n'));
        console.log(chalk.white(`Game ID: ${chalk.yellow(result.gameId)}`));
        console.log(chalk.white(`Repository: ${chalk.blue(result.repoUrl)}`));
        console.log(chalk.white(`\nNext steps:`));
        console.log(chalk.white(`  1. Review the code at ${result.repoUrl}`));
        console.log(chalk.white(`  2. Deploy: npm run deploy -- --game ${result.gameId}`));
      } else {
        console.log(chalk.red.bold('\n❌ FAILED\n'));
        console.log(chalk.red(result.message));
        if (result.errors) {
          result.errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
        }
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

/**
 * Deploy a game
 */
program
  .command('deploy-game')
  .description('Deploy a game to Google Play')
  .requiredOption('-g, --game <gameId>', 'Game ID to deploy')
  .action(async (options) => {
    try {
      if (!validateConfig()) {
        process.exit(1);
      }

      console.log(chalk.cyan('\n📦 Starting deployment...\n'));

      const orchestrator = new Orchestrator();
      const result = await orchestrator.deployGame(options.game);

      if (result.success) {
        console.log(chalk.green.bold('\n✅ DEPLOYED!\n'));
        console.log(chalk.white(`Build URL: ${chalk.blue(result.buildUrl)}`));
      } else {
        console.log(chalk.red.bold('\n❌ DEPLOYMENT FAILED\n'));
        console.log(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

/**
 * Analyze game performance
 */
program
  .command('analyze-performance')
  .description('Analyze performance of all games and select winner')
  .option('-d, --days <days>', 'Number of days to analyze', '30')
  .action(async (options) => {
    try {
      if (!validateConfig()) {
        process.exit(1);
      }

      console.log(chalk.cyan('\n📊 Analyzing game performance...\n'));

      const orchestrator = new Orchestrator();
      await orchestrator.analyzePerformance(parseInt(options.days, 10));
    } catch (error: any) {
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

/**
 * Extend a game with more levels
 */
program
  .command('extend-game')
  .description('Extend winner game with additional levels')
  .requiredOption('-g, --game <gameId>', 'Game ID to extend')
  .option('-l, --levels <count>', 'Number of levels to add', '10')
  .action(async (options) => {
    try {
      if (!validateConfig()) {
        process.exit(1);
      }

      console.log(chalk.cyan('\n🎯 Extending game...\n'));

      const orchestrator = new Orchestrator();
      const result = await orchestrator.extendGame({
        gameId: options.game,
        additionalLevels: parseInt(options.levels, 10)
      });

      if (result.success) {
        console.log(chalk.green.bold('\n✅ GAME EXTENDED!\n'));
        console.log(chalk.white(`Pull Request: ${chalk.blue(result.repoUrl)}`));
        console.log(chalk.white(`\nPlease review and merge the PR`));
      } else {
        console.log(chalk.red.bold('\n❌ EXTENSION FAILED\n'));
        console.log(chalk.red(result.message));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

/**
 * Sunset games
 */
program
  .command('sunset-games')
  .description('Archive underperforming games')
  .option('-e, --exclude <gameId>', 'Game ID to keep (winner)')
  .action(async (options) => {
    try {
      if (!validateConfig()) {
        process.exit(1);
      }

      console.log(chalk.cyan('\n🌅 Sunsetting games...\n'));

      // Confirm
      const response = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: 'This will archive all games except the excluded one. Continue?',
        initial: false
      });

      if (!response.confirmed) {
        console.log(chalk.yellow('Operation cancelled'));
        return;
      }

      const orchestrator = new Orchestrator();
      await orchestrator.sunsetGames(options.exclude);

      console.log(chalk.green.bold('\n✅ Games sunset complete\n'));
    } catch (error: any) {
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

/**
 * List all games
 */
program
  .command('list-games')
  .description('List all generated games')
  .action(async () => {
    try {
      const orchestrator = new Orchestrator();
      await orchestrator.listGames();
    } catch (error: any) {
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

/**
 * Initialize configuration
 */
program
  .command('init')
  .description('Initialize configuration and check setup')
  .action(async () => {
    console.log(chalk.cyan('\n🔧 Checking configuration...\n'));

    try {
      if (validateConfig()) {
        console.log(chalk.green('✅ Configuration is valid\n'));
        
        console.log(chalk.white('Available commands:'));
        console.log(chalk.white('  generate-game     - Generate a new game'));
        console.log(chalk.white('  deploy-game       - Deploy a game to Google Play'));
        console.log(chalk.white('  analyze-performance - Analyze all games'));
        console.log(chalk.white('  extend-game       - Add levels to winner'));
        console.log(chalk.white('  sunset-games      - Archive underperforming games'));
        console.log(chalk.white('  list-games        - List all games\n'));
      } else {
        console.log(chalk.red('❌ Configuration is invalid\n'));
        console.log(chalk.yellow('Please check your .env file and ensure all required variables are set\n'));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('\nError:'), error.message);
      console.log(chalk.yellow('\nMake sure to copy .env.template to .env and fill in your credentials\n'));
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
