/**
 * Logging utility with color-coded output
 */

import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, error?: any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`));
      if (error) {
        console.error(chalk.red(error.stack || error.message || error));
      }
    }
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
  }

  step(step: number, total: number, message: string): void {
    console.log(chalk.cyan(`\n[${step}/${total}] ${message}`));
  }

  section(title: string): void {
    console.log('\n' + chalk.bold.magenta(`=== ${title} ===`));
  }
}

export const logger = new Logger();

// Set log level from environment
if (process.env.LOG_LEVEL) {
  const level = process.env.LOG_LEVEL.toUpperCase();
  if (level in LogLevel) {
    logger.setLevel(LogLevel[level as keyof typeof LogLevel]);
  }
}
