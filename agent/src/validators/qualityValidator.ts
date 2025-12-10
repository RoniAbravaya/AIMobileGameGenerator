/**
 * Quality Validator
 * Automated quality assessment for generated games
 * Scores: Code Quality + Gameplay Quality + Visual Quality
 * 
 * Target: 80%+ of games pass quality gates without manual intervention
 */

export interface QualityScore {
  overall: number;        // 0-100 (average of dimensions)
  code: CodeQualityScore;
  gameplay: GameplayQualityScore;
  visual: VisualQualityScore;
  passed: boolean;        // true if overall >= threshold
  timestamp: Date;
}

export interface CodeQualityScore {
  score: number;          // 0-100
  compilation: boolean;   // TypeScript compiles
  linting: boolean;       // ESLint passes
  tests: boolean;         // Tests pass
  structure: number;      // 0-100 (code organization)
  details: {
    errors: string[];
    warnings: string[];
    metrics: {
      filesGenerated: number;
      linesOfCode: number;
      complexity: number;
    };
  };
}

export interface GameplayQualityScore {
  score: number;          // 0-100
  stability: boolean;     // No crashes during testing
  winReachable: boolean;  // Win condition can be triggered
  loseReachable: boolean; // Lose condition can be triggered
  scoringWorks: boolean;  // Score increases as expected
  controlsResponsive: boolean; // Input handling works
  details: {
    testDuration: number;   // Milliseconds
    inputsSimulated: number;
    crashCount: number;
    performanceScore: number; // FPS average
  };
}

export interface VisualQualityScore {
  score: number;          // 0-100
  contrast: boolean;      // WCAG AA compliance
  imagesLoad: boolean;    // All images load successfully
  layoutValid: boolean;   // No overflow/clipping
  animationsSmooth: boolean; // 60 FPS maintained
  themeConsistent: boolean;  // Theme applied correctly
  details: {
    contrastRatio: number;
    imageLoadTime: number;
    layoutIssues: string[];
    averageFPS: number;
  };
}

export interface QualityValidationConfig {
  thresholds: {
    overall: number;      // Minimum overall score (default: 70)
    code: number;         // Minimum code score (default: 90)
    gameplay: number;     // Minimum gameplay score (default: 85)
    visual: number;       // Minimum visual score (default: 85)
  };
  enableGameplayTesting: boolean;  // Run automated gameplay tests
  enableVisualValidation: boolean; // Run visual validation
  maxTestDuration: number;         // Max milliseconds for gameplay test
  simulatedInputs: number;         // Number of random inputs to simulate
}

export const DEFAULT_QUALITY_CONFIG: QualityValidationConfig = {
  thresholds: {
    overall: 70,
    code: 90,
    gameplay: 85,
    visual: 85
  },
  enableGameplayTesting: true,
  enableVisualValidation: true,
  maxTestDuration: 60000,  // 60 seconds
  simulatedInputs: 100
};

/**
 * Main quality validator class
 */
export class QualityValidator {
  constructor(private config: QualityValidationConfig = DEFAULT_QUALITY_CONFIG) {}

  /**
   * Validate a generated game
   */
  async validateGame(gamePath: string): Promise<QualityScore> {
    console.log(`[QualityValidator] Starting validation for: ${gamePath}`);
    
    // Run all validations in parallel where possible
    const [codeScore, gameplayScore, visualScore] = await Promise.all([
      this.validateCodeQuality(gamePath),
      this.config.enableGameplayTesting 
        ? this.validateGameplayQuality(gamePath) 
        : this.createEmptyGameplayScore(),
      this.config.enableVisualValidation 
        ? this.validateVisualQuality(gamePath) 
        : this.createEmptyVisualScore()
    ]);

    // Calculate overall score
    const overall = this.calculateOverallScore(codeScore, gameplayScore, visualScore);
    
    // Check if passed
    const passed = this.checkPassed(overall, codeScore, gameplayScore, visualScore);

    const result: QualityScore = {
      overall,
      code: codeScore,
      gameplay: gameplayScore,
      visual: visualScore,
      passed,
      timestamp: new Date()
    };

    console.log(`[QualityValidator] Validation complete. Overall: ${overall}/100, Passed: ${passed}`);
    
    return result;
  }

  /**
   * Validate code quality (compilation, linting, tests, structure)
   */
  private async validateCodeQuality(gamePath: string): Promise<CodeQualityScore> {
    console.log(`[CodeQuality] Validating code at: ${gamePath}`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check TypeScript compilation
    const compilation = await this.checkTypeScriptCompilation(gamePath, errors);
    
    // Check ESLint
    const linting = await this.checkLinting(gamePath, warnings);
    
    // Run tests
    const tests = await this.runTests(gamePath, errors);
    
    // Analyze code structure
    const structure = await this.analyzeCodeStructure(gamePath);
    
    // Get code metrics
    const metrics = await this.getCodeMetrics(gamePath);
    
    // Calculate score
    let score = 0;
    if (compilation) score += 40;  // Most important
    if (linting) score += 30;
    if (tests) score += 20;
    score += structure * 0.1;  // structure is 0-100, contributes up to 10 points
    
    return {
      score: Math.min(100, score),
      compilation,
      linting,
      tests,
      structure,
      details: {
        errors,
        warnings,
        metrics
      }
    };
  }

  /**
   * Validate gameplay quality (stability, win/lose, scoring, controls)
   */
  private async validateGameplayQuality(gamePath: string): Promise<GameplayQualityScore> {
    console.log(`[GameplayQuality] Testing gameplay...`);
    
    try {
      const { GameplayTester } = await import('../testing/gameplayTester.js');
      const tester = new GameplayTester({
        maxDuration: this.config.maxTestDuration,
        inputCount: this.config.simulatedInputs,
        minFPS: 45,
        timeoutPerAction: 1000
      });
      
      const result = await tester.testGameplay(gamePath);
      return result.score;
    } catch (error: any) {
      console.error('[GameplayQuality] Testing failed:', error);
      
      // Return failed score
      return {
        score: 0,
        stability: false,
        winReachable: false,
        loseReachable: false,
        scoringWorks: false,
        controlsResponsive: false,
        details: {
          testDuration: 0,
          inputsSimulated: 0,
          crashCount: 1,
          performanceScore: 0
        }
      };
    }
  }

  /**
   * Validate visual quality (contrast, images, layout, animations, theme)
   */
  private async validateVisualQuality(gamePath: string): Promise<VisualQualityScore> {
    console.log(`[VisualQuality] Validating visuals...`);
    
    try {
      const { VisualValidator } = await import('./visualValidator.js');
      const validator = new VisualValidator({
        checkContrast: true,
        checkImages: true,
        checkLayout: true,
        checkAnimations: true,
        checkTheme: true,
        minContrastRatio: 4.5
      });
      
      return await validator.validateVisualQuality(gamePath);
    } catch (error: any) {
      console.error('[VisualQuality] Validation failed:', error);
      
      // Return failed score
      return {
        score: 0,
        contrast: false,
        imagesLoad: false,
        layoutValid: false,
        animationsSmooth: false,
        themeConsistent: false,
        details: {
          contrastRatio: 0,
          imageLoadTime: 0,
          layoutIssues: [error.message],
          averageFPS: 0
        }
      };
    }
  }

  /**
   * Check TypeScript compilation
   */
  private async checkTypeScriptCompilation(gamePath: string, errors: string[]): Promise<boolean> {
    try {
      const { execa } = await import('execa');
      await execa('npx', ['tsc', '--noEmit'], { cwd: gamePath });
      console.log('[CodeQuality] ✅ TypeScript compilation passed');
      return true;
    } catch (error: any) {
      console.log('[CodeQuality] ❌ TypeScript compilation failed');
      if (error.stdout) errors.push(error.stdout);
      if (error.stderr) errors.push(error.stderr);
      return false;
    }
  }

  /**
   * Check ESLint
   */
  private async checkLinting(gamePath: string, warnings: string[]): Promise<boolean> {
    try {
      const { execa } = await import('execa');
      const result = await execa('npx', ['eslint', '.', '--ext', '.ts,.tsx'], { 
        cwd: gamePath,
        reject: false 
      });
      
      if (result.exitCode === 0) {
        console.log('[CodeQuality] ✅ ESLint passed');
        return true;
      } else {
        console.log('[CodeQuality] ⚠️ ESLint warnings found');
        if (result.stdout) warnings.push(result.stdout);
        return false;
      }
    } catch (error: any) {
      console.log('[CodeQuality] ❌ ESLint failed');
      warnings.push(error.message);
      return false;
    }
  }

  /**
   * Run tests
   */
  private async runTests(gamePath: string, errors: string[]): Promise<boolean> {
    try {
      const { execa } = await import('execa');
      await execa('npm', ['test'], { cwd: gamePath });
      console.log('[CodeQuality] ✅ Tests passed');
      return true;
    } catch (error: any) {
      console.log('[CodeQuality] ❌ Tests failed');
      if (error.stdout) errors.push(error.stdout);
      return false;
    }
  }

  /**
   * Analyze code structure (organization, patterns, best practices)
   */
  private async analyzeCodeStructure(gamePath: string): Promise<number> {
    // TODO: Implement detailed structure analysis
    // For now, basic file existence checks
    const fs = await import('fs-extra');
    const path = await import('path');
    
    let score = 0;
    const checks = [
      'app/game/generated/gameLogic.ts',
      'app/game/generated/entities.ts',
      'app/game/generated/controls.ts',
      'app/theme/generatedTheme.ts',
      'app/config/levels.generated.ts',
      'game-spec.json'
    ];
    
    for (const check of checks) {
      const exists = await fs.pathExists(path.join(gamePath, check));
      if (exists) score += (100 / checks.length);
    }
    
    return Math.round(score);
  }

  /**
   * Get code metrics
   */
  private async getCodeMetrics(gamePath: string): Promise<any> {
    // TODO: Implement metrics collection
    return {
      filesGenerated: 6,
      linesOfCode: 500,
      complexity: 10
    };
  }

  /**
   * Calculate overall score from dimension scores
   */
  private calculateOverallScore(
    code: CodeQualityScore,
    gameplay: GameplayQualityScore,
    visual: VisualQualityScore
  ): number {
    // Weighted average: code is most important
    const weights = {
      code: 0.4,
      gameplay: 0.35,
      visual: 0.25
    };
    
    const overall = 
      code.score * weights.code +
      gameplay.score * weights.gameplay +
      visual.score * weights.visual;
    
    return Math.round(overall);
  }

  /**
   * Check if quality thresholds are met
   */
  private checkPassed(
    overall: number,
    code: CodeQualityScore,
    gameplay: GameplayQualityScore,
    visual: VisualQualityScore
  ): boolean {
    return (
      overall >= this.config.thresholds.overall &&
      code.score >= this.config.thresholds.code &&
      gameplay.score >= this.config.thresholds.gameplay &&
      visual.score >= this.config.thresholds.visual
    );
  }

  /**
   * Create empty gameplay score (when testing disabled)
   */
  private createEmptyGameplayScore(): GameplayQualityScore {
    return {
      score: 100,
      stability: true,
      winReachable: true,
      loseReachable: true,
      scoringWorks: true,
      controlsResponsive: true,
      details: {
        testDuration: 0,
        inputsSimulated: 0,
        crashCount: 0,
        performanceScore: 0
      }
    };
  }

  /**
   * Create empty visual score (when validation disabled)
   */
  private createEmptyVisualScore(): VisualQualityScore {
    return {
      score: 100,
      contrast: true,
      imagesLoad: true,
      layoutValid: true,
      animationsSmooth: true,
      themeConsistent: true,
      details: {
        contrastRatio: 0,
        imageLoadTime: 0,
        layoutIssues: [],
        averageFPS: 0
      }
    };
  }
}

/**
 * Export singleton instance
 */
export const qualityValidator = new QualityValidator();
