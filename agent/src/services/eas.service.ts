/**
 * EAS Service - Handles Expo Application Services builds and submissions
 */

import { execa } from 'execa';
import { BuildResult, DeploymentResult, TestResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class EASService {
  private expoToken: string;

  constructor(expoToken: string) {
    this.expoToken = expoToken;
  }

  /**
   * Run tests in the project
   */
  async runTests(projectPath: string): Promise<TestResult> {
    logger.info('Running tests...');

    try {
      const result = await execa('npm', ['test', '--', '--passWithNoTests'], {
        cwd: projectPath,
        env: { ...process.env, CI: 'true' }
      });

      // Parse test output to extract pass/fail counts
      const output = result.stdout + result.stderr;
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);

      const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

      logger.success(`Tests completed: ${passed} passed, ${failed} failed`);

      return {
        success: failed === 0,
        passed,
        failed,
        logs: output
      };
    } catch (error: any) {
      logger.error('Tests failed', error);
      
      const output = error.stdout + error.stderr;
      const failedMatch = output.match(/(\d+) failed/);
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : 1;

      return {
        success: false,
        passed: 0,
        failed,
        errors: [error.message],
        logs: output
      };
    }
  }

  /**
   * Trigger EAS build for Android
   */
  async buildAndroid(projectPath: string, profile: string = 'production'): Promise<BuildResult> {
    logger.info(`Starting EAS build for Android (profile: ${profile})...`);

    try {
      const result = await execa(
        'eas',
        ['build', '--platform', 'android', '--profile', profile, '--non-interactive'],
        {
          cwd: projectPath,
          env: {
            ...process.env,
            EXPO_TOKEN: this.expoToken
          }
        }
      );

      const output = result.stdout;
      
      // Extract build URL from output
      const urlMatch = output.match(/Build details: (https:\/\/expo\.dev\/[^\s]+)/);
      const buildUrl = urlMatch ? urlMatch[1] : undefined;

      // Extract build ID
      const idMatch = output.match(/Build ID: ([a-f0-9-]+)/);
      const buildId = idMatch ? idMatch[1] : undefined;

      logger.success('EAS build completed successfully');
      if (buildUrl) {
        logger.info(`Build URL: ${buildUrl}`);
      }

      return {
        success: true,
        buildUrl,
        buildId,
        logs: output
      };
    } catch (error: any) {
      logger.error('EAS build failed', error);

      return {
        success: false,
        errors: [error.message],
        logs: error.stdout + error.stderr
      };
    }
  }

  /**
   * Submit build to Google Play
   */
  async submitToGooglePlay(projectPath: string): Promise<DeploymentResult> {
    logger.info('Submitting to Google Play...');

    try {
      const result = await execa(
        'eas',
        ['submit', '--platform', 'android', '--latest', '--non-interactive'],
        {
          cwd: projectPath,
          env: {
            ...process.env,
            EXPO_TOKEN: this.expoToken
          }
        }
      );

      const output = result.stdout;
      
      // Extract package name and version
      const packageMatch = output.match(/Package name: ([^\s]+)/);
      const versionMatch = output.match(/Version code: (\d+)/);

      const packageName = packageMatch ? packageMatch[1] : undefined;
      const versionCode = versionMatch ? parseInt(versionMatch[1], 10) : undefined;

      logger.success('Submitted to Google Play successfully');

      return {
        success: true,
        packageName,
        versionCode,
        status: 'submitted'
      };
    } catch (error: any) {
      logger.error('Google Play submission failed', error);

      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Initialize EAS project
   */
  async initProject(projectPath: string): Promise<void> {
    logger.info('Initializing EAS project...');

    try {
      await execa('eas', ['init', '--non-interactive'], {
        cwd: projectPath,
        env: {
          ...process.env,
          EXPO_TOKEN: this.expoToken
        }
      });

      logger.success('EAS project initialized');
    } catch (error) {
      // If already initialized, that's fine
      logger.warn('EAS project may already be initialized');
    }
  }

  /**
   * Configure EAS build
   */
  async configureBuild(projectPath: string): Promise<void> {
    logger.info('Configuring EAS build...');

    try {
      await execa('eas', ['build:configure', '--platform', 'android'], {
        cwd: projectPath,
        env: {
          ...process.env,
          EXPO_TOKEN: this.expoToken
        }
      });

      logger.success('EAS build configured');
    } catch (error) {
      logger.warn('Build configuration may already exist');
    }
  }

  /**
   * Check build status
   */
  async getBuildStatus(buildId: string): Promise<string> {
    try {
      const result = await execa('eas', ['build:view', buildId], {
        env: {
          ...process.env,
          EXPO_TOKEN: this.expoToken
        }
      });

      const output = result.stdout;
      const statusMatch = output.match(/Status: ([^\s]+)/);
      return statusMatch ? statusMatch[1].toLowerCase() : 'unknown';
    } catch (error) {
      logger.error('Failed to get build status', error);
      return 'error';
    }
  }

  /**
   * Install dependencies
   */
  async installDependencies(projectPath: string): Promise<void> {
    logger.info('Installing dependencies...');

    try {
      await execa('npm', ['install'], {
        cwd: projectPath
      });

      logger.success('Dependencies installed');
    } catch (error) {
      logger.error('Failed to install dependencies', error);
      throw error;
    }
  }

  /**
   * Run linter
   */
  async runLint(projectPath: string): Promise<boolean> {
    logger.info('Running linter...');

    try {
      await execa('npm', ['run', 'lint'], {
        cwd: projectPath
      });

      logger.success('Linting passed');
      return true;
    } catch (error) {
      logger.warn('Linting failed or not configured');
      return false;
    }
  }
}
