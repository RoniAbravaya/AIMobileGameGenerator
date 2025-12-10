/**
 * Mechanics Code Generator
 * 
 * Uses Claude AI to generate complete game mechanics code from a GameSpec.
 * Generates three files: entities.ts, gameLogic.ts, GameScreen.tsx
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import {
  buildMechanicsPrompt,
  parseMechanicsResponse,
  validateGeneratedMechanics,
  getSuggestedFixes,
  GeneratedMechanics,
  MechanicsValidationResult
} from '../prompts/mechanicsPrompt';
import { GameSpec } from '../models/GameSpec';

/**
 * Mechanics generation result
 */
export interface MechanicsGenerationResult {
  success: boolean;
  mechanics?: GeneratedMechanics;
  validation?: MechanicsValidationResult;
  error?: string;
  retries: number;
}

/**
 * Mechanics generation options
 */
export interface MechanicsGeneratorOptions {
  maxRetries?: number;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  outputDir?: string;
}

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 16000
};

/**
 * Mechanics Generator
 */
export class MechanicsGenerator {
  private anthropic: Anthropic;
  private options: Required<MechanicsGeneratorOptions>;

  constructor(options: MechanicsGeneratorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<MechanicsGeneratorOptions>;
    this.anthropic = new Anthropic({ apiKey: this.options.apiKey });
  }

  /**
   * Generate mechanics code from GameSpec
   */
  async generateMechanics(
    spec: GameSpec,
    maxRetries?: number
  ): Promise<MechanicsGenerationResult> {
    const retries = maxRetries ?? this.options.maxRetries;
    let lastError: string = '';

    console.log(`[MechanicsGenerator] Generating mechanics for: ${spec.name}`);
    console.log(`[MechanicsGenerator] High concept: ${spec.highConcept}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[MechanicsGenerator] Attempt ${attempt}/${retries}...`);

        // Build prompt
        const prompt = buildMechanicsPrompt(spec);

        // Add error feedback if this is a retry
        const fullPrompt = attempt > 1
          ? `${prompt}\n\n---\n\n## PREVIOUS ATTEMPT FAILED\n\nThe previous generation had these issues:\n${lastError}\n\nPlease fix these issues and regenerate complete, working code.`
          : prompt;

        // Call Claude API
        const response = await this.anthropic.messages.create({
          model: this.options.model,
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature,
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ]
        });

        // Extract response text
        const responseText = response.content
          .filter(block => block.type === 'text')
          .map(block => (block as any).text)
          .join('\n');

        console.log(`[MechanicsGenerator] Received ${responseText.length} chars`);

        // Parse response
        const mechanics = parseMechanicsResponse(responseText);
        console.log('[MechanicsGenerator] Parsed 3 files successfully');

        // Validate generated code
        const validation = validateGeneratedMechanics(mechanics);
        
        if (!validation.valid) {
          lastError = `Validation failed:\n${validation.errors.join('\n')}`;
          
          if (validation.warnings.length > 0) {
            lastError += `\n\nWarnings:\n${validation.warnings.join('\n')}`;
          }
          
          lastError += `\n\n${getSuggestedFixes(validation)}`;
          
          console.log(`[MechanicsGenerator] Validation failed: ${validation.errors.join(', ')}`);
          
          if (attempt < retries) {
            console.log('[MechanicsGenerator] Retrying with error feedback...');
            await this.sleep(1000 * attempt); // Exponential backoff
            continue;
          }
        } else {
          console.log('[MechanicsGenerator] ✅ Validation passed!');
          
          if (validation.warnings.length > 0) {
            console.log(`[MechanicsGenerator] ⚠️  Warnings: ${validation.warnings.join(', ')}`);
          }

          return {
            success: true,
            mechanics,
            validation,
            retries: attempt
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`[MechanicsGenerator] Attempt ${attempt} failed:`, lastError);

        if (attempt < retries) {
          console.log('[MechanicsGenerator] Retrying...');
          await this.sleep(1000 * attempt);
          continue;
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError,
      retries
    };
  }

  /**
   * Generate and save mechanics to files
   */
  async generateAndSave(
    spec: GameSpec,
    outputDir: string
  ): Promise<MechanicsGenerationResult> {
    // Generate mechanics
    const result = await this.generateMechanics(spec);

    if (!result.success || !result.mechanics) {
      return result;
    }

    // Save to files
    try {
      await this.saveMechanicsToFiles(result.mechanics, outputDir);
      console.log(`[MechanicsGenerator] ✅ Saved mechanics to ${outputDir}`);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to save files: ${error instanceof Error ? error.message : String(error)}`,
        retries: result.retries
      };
    }
  }

  /**
   * Save generated mechanics to files
   */
  async saveMechanicsToFiles(
    mechanics: GeneratedMechanics,
    outputDir: string
  ): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Save each file
    await Promise.all([
      fs.writeFile(
        path.join(outputDir, 'entities.ts'),
        mechanics.entities,
        'utf-8'
      ),
      fs.writeFile(
        path.join(outputDir, 'gameLogic.ts'),
        mechanics.gameLogic,
        'utf-8'
      ),
      fs.writeFile(
        path.join(outputDir, 'GameScreen.tsx'),
        mechanics.gameScreen,
        'utf-8'
      )
    ]);

    console.log('[MechanicsGenerator] Saved 3 files:');
    console.log(`  - ${path.join(outputDir, 'entities.ts')}`);
    console.log(`  - ${path.join(outputDir, 'gameLogic.ts')}`);
    console.log(`  - ${path.join(outputDir, 'GameScreen.tsx')}`);
  }

  /**
   * Sleep helper for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function to generate mechanics
 */
export async function generateMechanicsCode(
  spec: GameSpec,
  outputDir: string,
  apiKey: string,
  options?: Partial<MechanicsGeneratorOptions>
): Promise<MechanicsGenerationResult> {
  const generator = new MechanicsGenerator({
    apiKey,
    outputDir,
    ...options
  });

  return generator.generateAndSave(spec, outputDir);
}

/**
 * Test/preview mechanics generation without saving
 */
export async function previewMechanicsGeneration(
  spec: GameSpec,
  apiKey: string
): Promise<MechanicsGenerationResult> {
  const generator = new MechanicsGenerator({ apiKey });
  return generator.generateMechanics(spec);
}
