/**
 * AI Service - Handles code generation using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIGenerationRequest, AIGenerationResponse, GameType } from '../types/index.js';
import { GameSpec, validateGameSpec } from '../models/GameSpec.js';
import { buildGameSpecPrompt, parseGameSpecResponse, GameDesignHints, PreviousGameSummary } from '../prompts/gameSpecPrompt.js';
import { logger } from '../utils/logger.js';

export class AIService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate a new GameSpec (game design)
   * This is the FIRST step in creating a new game
   */
  async generateGameSpec(
    previousGames: PreviousGameSummary[] = [],
    hints?: GameDesignHints,
    maxRetries: number = 3
  ): Promise<GameSpec> {
    logger.info('Generating new GameSpec with AI...');
    
    if (previousGames.length > 0) {
      logger.info(`Previous games: ${previousGames.length} (avoiding repetition)`);
    }
    
    if (hints) {
      logger.info(`User hints: ${JSON.stringify(hints)}`);
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`GameSpec generation attempt ${attempt}/${maxRetries}...`);
        
        // Build prompt
        const prompt = buildGameSpecPrompt(previousGames, hints);
        
        // Call Claude
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          temperature: 0.85,  // Higher temp for more creativity
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
        
        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude API');
        }
        
        // Parse response
        const gameSpec = parseGameSpecResponse(content.text);
        
        // Validate
        const validation = validateGameSpec(gameSpec);
        
        if (!validation.valid) {
          logger.warn(`GameSpec validation failed on attempt ${attempt}`);
          logger.warn(`Errors: ${validation.errors.join(', ')}`);
          
          if (attempt < maxRetries) {
            // Try again with error feedback
            previousGames.push({
              id: 'invalid-attempt',
              name: 'Invalid Attempt',
              highConcept: validation.errors.join('; '),
              tags: [],
              genre: 'error'
            });
            continue;
          } else {
            throw new Error(`GameSpec validation failed: ${validation.errors.join(', ')}`);
          }
        }
        
        if (validation.warnings.length > 0) {
          logger.warn(`GameSpec warnings: ${validation.warnings.join(', ')}`);
        }
        
        logger.success(`GameSpec generated: ${gameSpec.name}`);
        logger.info(`Genre: ${gameSpec.mechanics.genre}`);
        logger.info(`Theme: ${gameSpec.visualTheme.mood}`);
        
        return gameSpec;
        
      } catch (error: any) {
        lastError = error;
        logger.error(`GameSpec generation attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          logger.info('Retrying with adjusted parameters...');
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw new Error(`Failed to generate GameSpec after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Generate game code based on requirements
   */
  async generateGame(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    logger.info(`Generating ${request.gameType} game: ${request.theme}`);

    const prompt = this.buildGameGenerationPrompt(request);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      return this.parseGameGenerationResponse(content.text);
    } catch (error) {
      logger.error('Failed to generate game code', error);
      throw error;
    }
  }

  /**
   * Generate fixes for failing tests or builds
   */
  async generateFix(errorLogs: string, fileContents: Record<string, string>): Promise<Record<string, string>> {
    logger.info('Generating fixes for errors...');

    const prompt = this.buildFixGenerationPrompt(errorLogs, fileContents);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      return this.parseFixResponse(content.text);
    } catch (error) {
      logger.error('Failed to generate fix', error);
      throw error;
    }
  }

  /**
   * Generate additional levels for extending a game
   */
  async generateLevels(
    gameType: GameType,
    existingLevels: any[],
    additionalCount: number
  ): Promise<any[]> {
    logger.info(`Generating ${additionalCount} additional levels...`);

    const prompt = this.buildLevelGenerationPrompt(gameType, existingLevels, additionalCount);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.8,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      return this.parseLevelsResponse(content.text);
    } catch (error) {
      logger.error('Failed to generate levels', error);
      throw error;
    }
  }

  /**
   * Build the main game generation prompt
   */
  private buildGameGenerationPrompt(request: AIGenerationRequest): string {
    const mechanicsStr = request.mechanics.join(', ');
    
    return `You are an expert React Native game developer using Expo. Generate a complete ${request.gameType} game.

Requirements:
- Theme: ${request.theme}
- Game Mechanics: ${mechanicsStr}
- Number of Levels: ${request.levelCount}
- Framework: Expo SDK 54, React Native 0.79, TypeScript
- Target Platform: Android (Expo Go compatible)
- NO native modules that require custom builds (no react-native-google-mobile-ads, no expo-linear-gradient, no @expo/vector-icons)
- DO NOT use require() for images - use placeholder colors or simple shapes instead
- DO NOT reference any asset files that don't exist

Game Structure:
1. Create a functional game with proper game loop
2. Include player controls, collision detection, scoring system
3. Lives system (start with 5 lives)
4. Coin collection system (rewarded after completing levels)
5. Progressive difficulty across levels
6. Pause/resume functionality
7. Game over and level complete screens

Technical Requirements:
- Use TypeScript with strict types
- Functional components with React hooks
- Use default exports for screen components
- Include comprehensive inline comments
- Handle edge cases (app backgrounding, interruptions)
- Follow React Native best practices
- Use only these dependencies: react, react-native, expo, expo-router, expo-status-bar, @react-native-async-storage/async-storage, react-native-safe-area-context

IMPORTANT OUTPUT RULES:
1. Do NOT wrap code in markdown code blocks (no \`\`\`typescript or \`\`\`)
2. Output ONLY raw TypeScript/JavaScript code between the file markers
3. Use default exports: "export default ComponentName" (not "export const ComponentName")

Output Format:
Provide the code in this EXACT structure (NO markdown formatting):

===FILE: app/screens/MenuScreen.tsx===
import React from 'react';
// ... rest of the code with NO markdown code blocks
export default MenuScreen;
===END FILE===

===FILE: app/screens/GameScreen.tsx===
import React from 'react';
// ... rest of the code with NO markdown code blocks
export default GameScreen;
===END FILE===

===FILE: app/screens/ShopScreen.tsx===
import React from 'react';
// ... rest of the code with NO markdown code blocks
export default ShopScreen;
===END FILE===

===FILE: app/config/levels.ts===
// ... level configuration
===END FILE===

===FILE: __tests__/game-logic.test.ts===
// ... tests
===END FILE===

Generate complete, production-ready code that works in Expo Go without native builds.`;
  }

  /**
   * Build the fix generation prompt
   */
  private buildFixGenerationPrompt(errorLogs: string, fileContents: Record<string, string>): string {
    const filesStr = Object.entries(fileContents)
      .map(([path, content]) => `===FILE: ${path}===\n${content}\n===END FILE===`)
      .join('\n\n');

    return `The following build/test failed with these errors:

${errorLogs}

Current file contents:
${filesStr}

Your task: Analyze the error and provide ONLY the necessary fixes.

Output Format:
For each file that needs changes:

===FIX: filepath===
[complete corrected file content]
===END FIX===

===EXPLANATION===
Brief explanation of what was wrong and how you fixed it
===END EXPLANATION===

Provide complete file contents, not diffs. Focus on fixing the specific errors.`;
  }

  /**
   * Build the level generation prompt
   */
  private buildLevelGenerationPrompt(
    gameType: GameType,
    existingLevels: any[],
    additionalCount: number
  ): string {
    const existingStr = JSON.stringify(existingLevels, null, 2);

    return `Generate ${additionalCount} additional levels for a ${gameType} game.

Existing levels:
${existingStr}

Requirements:
1. Continue the progression from existing levels
2. Increase difficulty gradually
3. Introduce new challenges and mechanics
4. Keep the same structure/schema as existing levels
5. Be creative but maintain consistency

Output Format:
Return ONLY a valid JSON array of level objects, no markdown, no explanation:

[
  { "id": N, "name": "...", "difficulty": "...", ... },
  ...
]`;
  }

  /**
   * Parse the game generation response
   */
  private parseGameGenerationResponse(text: string): AIGenerationResponse {
    const code: Record<string, string> = {};
    const tests: Record<string, string> = {};

    // Extract files using regex
    const fileRegex = /===FILE: (.+?)===\n([\s\S]+?)\n===END FILE===/g;
    let match;

    while ((match = fileRegex.exec(text)) !== null) {
      const [, filepath, content] = match;
      const cleanPath = filepath.trim();
      
      // Strip markdown code blocks if AI accidentally included them
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/^```(?:typescript|tsx|ts|javascript|js)?\n?/gm, '');
      cleanContent = cleanContent.replace(/\n?```$/gm, '');
      cleanContent = cleanContent.trim();

      if (cleanPath.includes('__tests__')) {
        tests[cleanPath] = cleanContent;
      } else {
        code[cleanPath] = cleanContent;
      }
    }

    // Extract levels from the levels.ts file
    let levels: any[] = [];
    const levelsFile = code['app/config/levels.ts'];
    if (levelsFile) {
      // Try to extract level data (this is a simple extraction, might need refinement)
      try {
        const levelsMatch = levelsFile.match(/export const LEVELS[:\s]*=\s*(\[[\s\S]+?\]);/);
        if (levelsMatch) {
          // This is a simplification - in production you'd want safer parsing
          levels = eval(levelsMatch[1]); // Note: eval is used here for simplicity, use a proper parser in production
        }
      } catch (error) {
        logger.warn('Could not extract levels from generated code');
      }
    }

    return {
      code,
      levels,
      tests,
      explanation: 'Game code generated successfully'
    };
  }

  /**
   * Parse the fix response
   */
  private parseFixResponse(text: string): Record<string, string> {
    const fixes: Record<string, string> = {};

    const fixRegex = /===FIX: (.+?)===\n([\s\S]+?)\n===END FIX===/g;
    let match;

    while ((match = fixRegex.exec(text)) !== null) {
      const [, filepath, content] = match;
      fixes[filepath.trim()] = content.trim();
    }

    return fixes;
  }

  /**
   * Parse the levels response
   */
  private parseLevelsResponse(text: string): any[] {
    try {
      // Remove markdown code blocks if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      logger.error('Failed to parse levels JSON', error);
      throw new Error('Invalid JSON response for levels');
    }
  }

  /**
   * Generate mechanics code from GameSpec
   * This is the SECOND step in creating a new game (after GameSpec)
   */
  async generateMechanics(
    spec: GameSpec,
    maxRetries: number = 3
  ): Promise<{
    entities: string;
    gameLogic: string;
    gameScreen: string;
  }> {
    logger.info(`Generating mechanics code for: ${spec.name}`);
    
    const { buildMechanicsPrompt, parseMechanicsResponse, validateGeneratedMechanics, getSuggestedFixes } = await import('../prompts/mechanicsPrompt.js');
    
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Mechanics generation attempt ${attempt}/${maxRetries}...`);
        
        // Build prompt
        const prompt = buildMechanicsPrompt(spec);
        
        // Add error feedback if this is a retry
        const fullPrompt = attempt > 1
          ? `${prompt}\n\n---\n\n## PREVIOUS ATTEMPT FAILED\n\nThe previous generation had these issues:\n${lastError}\n\nPlease fix these issues and regenerate complete, working code.`
          : prompt;
        
        // Call Claude
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
          temperature: 0.7,
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
        
        logger.info(`Received ${responseText.length} characters`);
        
        // Parse response
        const mechanics = parseMechanicsResponse(responseText);
        logger.info('Parsed 3 files successfully');
        
        // Validate
        const validation = validateGeneratedMechanics(mechanics);
        
        if (!validation.valid) {
          lastError = `Validation failed:\n${validation.errors.join('\n')}`;
          
          if (validation.warnings.length > 0) {
            lastError += `\n\nWarnings:\n${validation.warnings.join('\n')}`;
          }
          
          lastError += `\n\n${getSuggestedFixes(validation)}`;
          
          logger.warn(`Validation failed: ${validation.errors.join(', ')}`);
          
          if (attempt < maxRetries) {
            logger.info('Retrying with error feedback...');
            await this.sleep(1000 * attempt);
            continue;
          }
        } else {
          logger.info('✅ Validation passed!');
          
          if (validation.warnings.length > 0) {
            logger.warn(`⚠️  Warnings: ${validation.warnings.join(', ')}`);
          }
          
          return mechanics;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        logger.error(`Attempt ${attempt} failed: ${lastError}`);
        
        if (attempt < maxRetries) {
          logger.info('Retrying...');
          await this.sleep(1000 * attempt);
          continue;
        }
      }
    }
    
    throw new Error(`Failed to generate valid mechanics after ${maxRetries} attempts: ${lastError}`);
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
