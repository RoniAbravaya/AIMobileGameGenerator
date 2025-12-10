/**
 * Generation Orchestrator
 * 
 * Orchestrates the complete game generation workflow with:
 * - Retry logic for failed generations
 * - Quality validation after each attempt
 * - Error feedback to LLM
 * - Template fallback if all retries fail
 * - Cost tracking
 * - Success rate monitoring
 */

import { GameSpec } from '../models/GameSpec';
import { AIService } from '../services/ai.service';
import { ImageService } from '../services/image.service';
import { ThemeGenerator, generateAndSaveTheme } from '../generators/themeGenerator';
import { MechanicsGenerator } from '../generators/mechanicsGenerator';
import { QualityValidator, QualityScore } from '../validators/qualityValidator';
import path from 'path';
import fs from 'fs/promises';

/**
 * Generation attempt result
 */
export interface GenerationAttempt {
  attempt: number;
  success: boolean;
  qualityScore?: QualityScore;
  error?: string;
  costEstimate: number; // USD
  duration: number; // milliseconds
}

/**
 * Complete generation result
 */
export interface GenerationResult {
  success: boolean;
  gameSpec?: GameSpec;
  outputDir?: string;
  attempts: GenerationAttempt[];
  totalCost: number;
  totalDuration: number;
  fallbackUsed: boolean;
  error?: string;
}

/**
 * Generation configuration
 */
export interface GenerationConfig {
  maxRetries: number;
  minQualityScore: number;
  costBudget: number; // Max USD per game
  enableFallback: boolean;
  apiKey: string;
  imageApiKey?: string;
  outputBaseDir: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<GenerationConfig> = {
  maxRetries: 5,
  minQualityScore: 70,
  costBudget: 5.0,
  enableFallback: true
};

/**
 * Generation Orchestrator
 * 
 * Manages the end-to-end game generation process with retries and fallback.
 */
export class GenerationOrchestrator {
  private aiService: AIService;
  private imageService: ImageService;
  private themeGenerator: ThemeGenerator;
  private mechanicsGenerator: MechanicsGenerator;
  private qualityValidator: QualityValidator;
  private config: GenerationConfig;

  constructor(config: GenerationConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as GenerationConfig;
    this.aiService = new AIService(this.config.apiKey);
    this.imageService = new ImageService();
    this.themeGenerator = new ThemeGenerator();
    this.mechanicsGenerator = new MechanicsGenerator({
      apiKey: this.config.apiKey
    });
    this.qualityValidator = new QualityValidator();
  }

  /**
   * Generate a complete game with retry logic
   */
  async generateGame(
    previousGames: any[] = [],
    hints?: any
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const attempts: GenerationAttempt[] = [];
    let totalCost = 0;

    console.log('[Orchestrator] Starting game generation...');
    console.log(`[Orchestrator] Max retries: ${this.config.maxRetries}`);
    console.log(`[Orchestrator] Min quality score: ${this.config.minQualityScore}`);
    console.log(`[Orchestrator] Cost budget: $${this.config.costBudget}`);

    // Step 1: Generate GameSpec (with its own retries)
    let gameSpec: GameSpec;
    try {
      gameSpec = await this.aiService.generateGameSpec(previousGames, hints, 3);
      console.log(`[Orchestrator] ✅ GameSpec generated: ${gameSpec.name}`);
      totalCost += 0.05; // Rough estimate for GameSpec generation
    } catch (error) {
      return {
        success: false,
        attempts,
        totalCost,
        totalDuration: Date.now() - startTime,
        fallbackUsed: false,
        error: `Failed to generate GameSpec: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Step 2: Attempt full generation with retries
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      console.log(`\n[Orchestrator] === Attempt ${attempt}/${this.config.maxRetries} ===`);

      try {
        // Check budget
        if (totalCost >= this.config.costBudget) {
          console.log(`[Orchestrator] ⚠️  Budget exceeded ($${totalCost.toFixed(2)}), stopping`);
          break;
        }

        // Generate game content
        const attemptResult = await this.attemptGeneration(gameSpec, attempt);
        
        const attemptCost = attemptResult.costEstimate;
        const attemptDuration = Date.now() - attemptStartTime;
        
        totalCost += attemptCost;
        
        attempts.push({
          attempt,
          success: attemptResult.success,
          qualityScore: attemptResult.qualityScore,
          error: attemptResult.error,
          costEstimate: attemptCost,
          duration: attemptDuration
        });

        if (attemptResult.success && attemptResult.qualityScore) {
          // Check quality threshold
          if (attemptResult.qualityScore.overall >= this.config.minQualityScore) {
            console.log(`[Orchestrator] ✅ SUCCESS! Quality: ${attemptResult.qualityScore.overall}/100`);
            
            return {
              success: true,
              gameSpec,
              outputDir: attemptResult.outputDir,
              attempts,
              totalCost,
              totalDuration: Date.now() - startTime,
              fallbackUsed: false
            };
          } else {
            console.log(`[Orchestrator] ⚠️  Quality too low: ${attemptResult.qualityScore.overall}/100 (min: ${this.config.minQualityScore})`);
            
            // If last attempt, consider lowering threshold
            if (attempt === this.config.maxRetries) {
              console.log('[Orchestrator] Last attempt, accepting lower quality...');
              
              return {
                success: true,
                gameSpec,
                outputDir: attemptResult.outputDir,
                attempts,
                totalCost,
                totalDuration: Date.now() - startTime,
                fallbackUsed: false
              };
            }
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[Orchestrator] Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      } catch (error) {
        console.error(`[Orchestrator] Attempt ${attempt} error:`, error);
        
        attempts.push({
          attempt,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          costEstimate: 0.5,
          duration: Date.now() - attemptStartTime
        });
        
        totalCost += 0.5;
      }
    }

    // Step 3: All retries failed, use fallback if enabled
    if (this.config.enableFallback) {
      console.log('\n[Orchestrator] All retries failed, using template fallback...');
      
      try {
        const fallbackResult = await this.useFallbackTemplate(gameSpec);
        
        return {
          success: true,
          gameSpec,
          outputDir: fallbackResult.outputDir,
          attempts,
          totalCost,
          totalDuration: Date.now() - startTime,
          fallbackUsed: true
        };
      } catch (error) {
        return {
          success: false,
          attempts,
          totalCost,
          totalDuration: Date.now() - startTime,
          fallbackUsed: false,
          error: `All retries failed and fallback failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // No fallback, complete failure
    return {
      success: false,
      attempts,
      totalCost,
      totalDuration: Date.now() - startTime,
      fallbackUsed: false,
      error: 'All generation attempts failed and fallback is disabled'
    };
  }

  /**
   * Attempt a single generation
   */
  private async attemptGeneration(
    spec: GameSpec,
    attemptNumber: number
  ): Promise<{
    success: boolean;
    qualityScore?: QualityScore;
    outputDir?: string;
    error?: string;
    costEstimate: number;
  }> {
    const outputDir = path.join(
      this.config.outputBaseDir,
      `${spec.id}-attempt-${attemptNumber}`
    );

    await fs.mkdir(outputDir, { recursive: true });

    try {
      // 1. Generate theme
      console.log('[Orchestrator] Generating theme...');
      const themeOutputPath = path.join(outputDir, 'app', 'theme', 'generatedTheme.ts');
      await fs.mkdir(path.dirname(themeOutputPath), { recursive: true });
      await generateAndSaveTheme(spec, themeOutputPath);
      console.log('[Orchestrator] ✓ Theme generated');

      // 2. Generate mechanics code
      console.log('[Orchestrator] Generating mechanics...');
      const mechanicsDir = path.join(outputDir, 'app', 'game');
      const mechanicsResult = await this.mechanicsGenerator.generateAndSave(spec, mechanicsDir);
      
      if (!mechanicsResult.success) {
        return {
          success: false,
          error: mechanicsResult.error,
          costEstimate: 1.0
        };
      }
      console.log('[Orchestrator] ✓ Mechanics generated');

      // 3. Generate images
      console.log('[Orchestrator] Generating images...');
      const assetsDir = path.join(outputDir, 'assets', 'generated');
      await this.imageService.generateGameAssets(spec, assetsDir);
      console.log('[Orchestrator] ✓ Images generated');

      // 4. Validate quality
      console.log('[Orchestrator] Validating quality...');
      const qualityScore = await this.qualityValidator.validateGame(outputDir);
      console.log(`[Orchestrator] Quality score: ${qualityScore.overall}/100`);
      console.log(`  - Code: ${qualityScore.code}/100`);
      console.log(`  - Gameplay: ${qualityScore.gameplay}/100`);
      console.log(`  - Visual: ${qualityScore.visual}/100`);

      return {
        success: true,
        qualityScore,
        outputDir,
        costEstimate: 2.0 // Rough estimate: mechanics (1.0) + images (1.0)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        costEstimate: 1.0
      };
    }
  }

  /**
   * Use fallback template
   * Creates a basic working game using the generic runtime
   */
  private async useFallbackTemplate(spec: GameSpec): Promise<{ outputDir: string }> {
    const outputDir = path.join(this.config.outputBaseDir, `${spec.id}-fallback`);
    await fs.mkdir(outputDir, { recursive: true });

    console.log('[Orchestrator] Creating fallback game from template...');

    // Generate theme (this always works)
    const themeOutputPath = path.join(outputDir, 'app', 'theme', 'generatedTheme.ts');
    await fs.mkdir(path.dirname(themeOutputPath), { recursive: true });
    await generateAndSaveTheme(spec, themeOutputPath);

    // Generate basic images (fallback images)
    const assetsDir = path.join(outputDir, 'assets', 'generated');
    await this.imageService.generateGameAssets(spec, assetsDir);

    // Copy generic game template (simple runner mechanics)
    // This uses the runtime but with minimal, known-working game logic
    const templatePath = path.join(__dirname, '../../../game-template');
    await this.copyDirectory(templatePath, outputDir);

    console.log('[Orchestrator] ✅ Fallback game created');

    return { outputDir };
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get generation statistics
   */
  static getStatistics(results: GenerationResult[]): {
    totalGames: number;
    successful: number;
    failed: number;
    fallbackUsed: number;
    averageCost: number;
    averageDuration: number;
    averageAttempts: number;
    successRate: number;
  } {
    const totalGames = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const fallbackUsed = results.filter(r => r.fallbackUsed).length;
    
    const totalCost = results.reduce((sum, r) => sum + r.totalCost, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.totalDuration, 0);
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts.length, 0);

    return {
      totalGames,
      successful,
      failed,
      fallbackUsed,
      averageCost: totalGames > 0 ? totalCost / totalGames : 0,
      averageDuration: totalGames > 0 ? totalDuration / totalGames : 0,
      averageAttempts: totalGames > 0 ? totalAttempts / totalGames : 0,
      successRate: totalGames > 0 ? (successful / totalGames) * 100 : 0
    };
  }
}

/**
 * Convenience function to generate a single game
 */
export async function generateGame(
  config: GenerationConfig,
  previousGames?: any[],
  hints?: any
): Promise<GenerationResult> {
  const orchestrator = new GenerationOrchestrator(config);
  return orchestrator.generateGame(previousGames, hints);
}
