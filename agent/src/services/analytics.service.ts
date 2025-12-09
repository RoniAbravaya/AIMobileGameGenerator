/**
 * Analytics Service - Tracks performance and selects winner games
 */

import { GameMetrics, AnalysisResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { GooglePlayService } from './googleplay.service.js';

export class AnalyticsService {
  private googlePlayService: GooglePlayService;

  constructor(googlePlayService: GooglePlayService) {
    this.googlePlayService = googlePlayService;
  }

  /**
   * Calculate weighted score for a game
   */
  calculateScore(metrics: GameMetrics): number {
    // Weighted scoring algorithm
    const weights = {
      installs: 0.25,
      retention7Day: 0.30,
      arpdau: 0.25,
      crashFree: 0.10,
      retention1Day: 0.10
    };

    const score = (
      (metrics.installs / 1000) * weights.installs +
      (metrics.retention7Day * 100) * weights.retention7Day +
      (metrics.arpdau * 1000) * weights.arpdau +
      ((1 - metrics.crashRate) * 100) * weights.crashFree +
      (metrics.retention1Day * 100) * weights.retention1Day
    );

    return Math.round(score * 100) / 100;
  }

  /**
   * Analyze performance of multiple games and select winner
   */
  async analyzeGames(gameConfigs: Array<{ id: string; packageName: string }>): Promise<AnalysisResult> {
    logger.section('Analyzing Game Performance');

    const metricsPromises = gameConfigs.map(async config => {
      try {
        const metrics = await this.googlePlayService.getGameMetrics(config.id, config.packageName);
        metrics.score = this.calculateScore(metrics);
        return metrics;
      } catch (error) {
        logger.error(`Failed to get metrics for ${config.id}`, error);
        return null;
      }
    });

    const allMetrics = (await Promise.all(metricsPromises)).filter(m => m !== null) as GameMetrics[];

    // Sort by score descending
    allMetrics.sort((a, b) => b.score - a.score);

    const winner = allMetrics.length > 0 ? allMetrics[0] : undefined;

    // Generate recommendations
    const recommendations = this.generateRecommendations(allMetrics, winner);

    const result: AnalysisResult = {
      games: allMetrics,
      winner,
      recommendations,
      timestamp: new Date()
    };

    this.logAnalysisReport(result);

    return result;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(games: GameMetrics[], winner?: GameMetrics): string[] {
    const recommendations: string[] = [];

    if (!winner) {
      recommendations.push('No games have sufficient data for analysis');
      return recommendations;
    }

    recommendations.push(`Winner: ${winner.gameId} with score ${winner.score}`);

    // Check retention
    if (winner.retention7Day < 0.1) {
      recommendations.push('Winner has low 7-day retention - consider improving onboarding and early game experience');
    } else if (winner.retention7Day > 0.3) {
      recommendations.push('Winner has excellent retention - focus on monetization optimization');
    }

    // Check monetization
    if (winner.arpdau < 0.01) {
      recommendations.push('Low ARPDAU - consider adjusting ad frequency or adding more IAP options');
    }

    // Check crash rate
    if (winner.crashRate > 0.05) {
      recommendations.push('High crash rate detected - prioritize stability fixes before expansion');
    }

    // Check install count
    if (winner.installs < 1000) {
      recommendations.push('Low install count - increase marketing budget for winner game');
    }

    // Recommendations for other games
    const topPerformers = games.slice(0, 3);
    const poorPerformers = games.slice(-3);

    if (topPerformers.length > 1) {
      recommendations.push(`Consider A/B testing features between top performers: ${topPerformers.map(g => g.gameId).join(', ')}`);
    }

    recommendations.push(`Sunset low performers: ${poorPerformers.map(g => g.gameId).join(', ')}`);

    // Extension recommendation
    recommendations.push(`Extend ${winner.gameId} with 10 additional levels and enhanced features`);

    return recommendations;
  }

  /**
   * Log analysis report to console
   */
  private logAnalysisReport(result: AnalysisResult): void {
    logger.section('Performance Analysis Report');
    
    console.log('\nGame Rankings:');
    console.log('─'.repeat(80));
    console.log('Rank | Game ID           | Score  | Installs | 7d Ret | ARPDAU  | Crashes');
    console.log('─'.repeat(80));

    result.games.forEach((game, index) => {
      const rank = (index + 1).toString().padStart(4);
      const gameId = game.gameId.padEnd(18);
      const score = game.score.toFixed(2).padStart(6);
      const installs = game.installs.toString().padStart(8);
      const retention = (game.retention7Day * 100).toFixed(1).padStart(6) + '%';
      const arpdau = '$' + game.arpdau.toFixed(3).padStart(6);
      const crashes = (game.crashRate * 100).toFixed(1).padStart(6) + '%';

      console.log(`${rank} | ${gameId} | ${score} | ${installs} | ${retention} | ${arpdau} | ${crashes}`);
    });

    console.log('─'.repeat(80));

    if (result.winner) {
      logger.success(`\n🏆 Winner: ${result.winner.gameId} (Score: ${result.winner.score})`);
    }

    console.log('\nRecommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    console.log('\n');
  }

  /**
   * Export analysis to JSON file
   */
  async exportAnalysis(result: AnalysisResult, outputPath: string): Promise<void> {
    const fs = await import('fs-extra');
    
    try {
      await fs.writeJson(outputPath, result, { spaces: 2 });
      logger.success(`Analysis exported to ${outputPath}`);
    } catch (error) {
      logger.error('Failed to export analysis', error);
      throw error;
    }
  }

  /**
   * Compare two games
   */
  compareGames(game1: GameMetrics, game2: GameMetrics): string {
    const differences: string[] = [];

    const metrics = [
      { key: 'installs', label: 'Installs' },
      { key: 'retention7Day', label: '7-Day Retention', format: (v: number) => `${(v * 100).toFixed(1)}%` },
      { key: 'arpdau', label: 'ARPDAU', format: (v: number) => `$${v.toFixed(3)}` },
      { key: 'crashRate', label: 'Crash Rate', format: (v: number) => `${(v * 100).toFixed(1)}%` }
    ];

    metrics.forEach(({ key, label, format }) => {
      const val1 = (game1 as any)[key];
      const val2 = (game2 as any)[key];
      const diff = val1 - val2;
      const diffPercent = val2 !== 0 ? ((diff / val2) * 100).toFixed(1) : 'N/A';

      const formatted1 = format ? format(val1) : val1;
      const formatted2 = format ? format(val2) : val2;

      differences.push(`${label}: ${formatted1} vs ${formatted2} (${diffPercent}% diff)`);
    });

    return differences.join('\n');
  }
}
