/**
 * Configuration loader for the AI agent
 * Loads environment variables from .env file in project root
 */

import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AgentConfig } from '../types/index.js';
import { logger } from './logger.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root (.env is in parent of agent folder)
const envPath = resolve(__dirname, '../../../.env');
loadEnv({ path: envPath });

export function getConfig(): AgentConfig {
  const requiredVars = [
    'GITHUB_TOKEN',
    'GITHUB_ORG',
    'EXPO_TOKEN',
    'ANTHROPIC_API_KEY'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    githubToken: process.env.GITHUB_TOKEN!,
    githubOrg: process.env.GITHUB_ORG!,
    expoToken: process.env.EXPO_TOKEN!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    googlePlayServiceAccountPath: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH || './secrets/google-play-key.json',
    generatedGamesDir: process.env.GENERATED_GAMES_DIR || './generated-games',
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    autoMergeOnTestPass: process.env.AUTO_MERGE_ON_TEST_PASS === 'true'
  };
}

export function validateConfig(): boolean {
  try {
    const config = getConfig();
    logger.info('Configuration validated successfully');
    return true;
  } catch (error) {
    logger.error('Configuration validation failed', error);
    return false;
  }
}
