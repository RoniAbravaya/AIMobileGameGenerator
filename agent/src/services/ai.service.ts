/**
 * AI Service - Handles code generation using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIGenerationRequest, AIGenerationResponse, GameType } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AIService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
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
- Framework: Expo SDK 50+, React Native, TypeScript
- Target Platform: Android only
- Monetization: AdMob banners + interstitials, In-app purchases (coins/lives)

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
- Create reusable components
- Include comprehensive inline comments
- Handle edge cases (app backgrounding, interruptions)
- Follow React Native best practices

Monetization Integration:
- AdMob banner on menu screen
- Interstitial ad between levels (not too aggressive)
- Purchase buttons for coins/lives

Output Format:
Provide the code in this structure:

===FILE: app/screens/MenuScreen.tsx===
[code here]
===END FILE===

===FILE: app/screens/GameScreen.tsx===
[code here]
===END FILE===

===FILE: app/screens/GameOverScreen.tsx===
[code here]
===END FILE===

===FILE: app/components/GameEngine/GameEngine.tsx===
[code here]
===END FILE===

===FILE: app/config/levels.ts===
[code here]
===END FILE===

===FILE: app/hooks/useGameState.ts===
[code here]
===END FILE===

===FILE: __tests__/game-logic.test.ts===
[code here]
===END FILE===

Generate complete, production-ready code. Be creative with the game mechanics while keeping it simple and fun.`;
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
      const cleanContent = content.trim();

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
}
