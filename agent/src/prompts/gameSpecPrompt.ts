/**
 * GameSpec Generation Prompt
 * LLM prompt for designing new mobile 2D games
 * 
 * This is the MOST CRITICAL prompt in the system.
 * It asks an LLM to invent completely new game concepts from scratch.
 */

import { GameSpec } from '../models/GameSpec.js';

/**
 * User hints for game design
 */
export interface GameDesignHints {
  tone?: string;          // e.g., "zen peaceful", "intense fast-paced"
  difficulty?: string;    // e.g., "easy", "medium", "hard"
  style?: string;         // e.g., "minimalist", "vibrant"
  avoid?: string[];       // Topics/themes to avoid
}

/**
 * Previous game summary for novelty checking
 */
export interface PreviousGameSummary {
  id: string;
  name: string;
  highConcept: string;
  tags: string[];
  genre: string;
}

/**
 * Build the complete GameSpec generation prompt
 */
export function buildGameSpecPrompt(
  previousGames: PreviousGameSummary[],
  hints?: GameDesignHints
): string {
  const systemInstructions = getSystemInstructions();
  const constraints = getConstraints();
  const schema = getGameSpecSchema();
  const examples = getExamples();
  const previousGamesSection = formatPreviousGames(previousGames);
  const hintsSection = formatHints(hints);
  const outputInstructions = getOutputInstructions();

  return `${systemInstructions}

${constraints}

${previousGamesSection}

${hintsSection}

${schema}

${examples}

${outputInstructions}`;
}

/**
 * System instructions for the LLM
 */
function getSystemInstructions(): string {
  return `You are a senior mobile 2D game designer and gameplay programmer with 15+ years of experience creating hit casual mobile games.

Your job is to invent a NEW, ORIGINAL 2D mobile game concept that can be implemented using React Native / Expo with simple 2D rendering.

Your designs are known for being:
- Fresh and innovative (not copies of existing games)
- Implementable with simple code (no complex physics engines needed)
- Fun and engaging for casual mobile players
- Visually distinctive with clear themes
- Balanced in difficulty progression`;
}

/**
 * Technical and creative constraints
 */
function getConstraints(): string {
  return `## CONSTRAINTS (MUST FOLLOW)

### Technical Constraints:
- The game MUST be 2D only (no full 3D, no complex 3D physics)
- Camera can be: fixed, horizontally scrolling, or vertically scrolling
- Controls limited to: tap, double tap, long press, drag, swipe, simple virtual buttons
- Must be single-player only (no network multiplayer)
- Must be implementable with simple 2D logic (AABB collision, basic velocity/position math)
- Core game loop should be compact (implementable in under 1000 lines of code per mechanic)

### Creative Constraints:
- NO use of licensed IP or trademarks (no Star Wars, Marvel, Pokemon, etc.)
- ALWAYS use original names and concepts
- Avoid overly complex mechanics that would need advanced AI or pathfinding
- Focus on clear, understandable gameplay loops
- Must work well with touch controls on mobile devices

### Originality Requirement:
- The game MUST be significantly different from previously generated games (see below)
- Avoid similar names, themes, genres, and core mechanics
- Aim for at least 60% difference in gameplay and 80% difference in visual theme`;
}

/**
 * Format previous games for novelty checking
 */
function formatPreviousGames(previousGames: PreviousGameSummary[]): string {
  if (previousGames.length === 0) {
    return `## PREVIOUSLY GENERATED GAMES

No games have been generated yet. You have complete creative freedom!`;
  }

  const gamesList = previousGames.map((game, idx) => {
    return `${idx + 1}. "${game.name}"
   - ID: ${game.id}
   - Genre: ${game.genre}
   - Concept: ${game.highConcept}
   - Tags: ${game.tags.join(', ')}`;
  }).join('\n\n');

  return `## PREVIOUSLY GENERATED GAMES

These games have already been created. Your new game MUST be significantly different:

${gamesList}

IMPORTANT: Analyze these games and deliberately choose different:
- Core mechanics (avoid similar gameplay loops)
- Visual themes (choose different moods and color palettes)
- Game genres (don't repeat genre combinations)
- Control schemes (vary the input patterns)`;
}

/**
 * Format user hints
 */
function formatHints(hints?: GameDesignHints): string {
  if (!hints || Object.keys(hints).length === 0) {
    return `## USER PREFERENCES

No specific preferences provided. Design based on your expert judgment.`;
  }

  const sections: string[] = [];

  if (hints.tone) {
    sections.push(`- Desired tone: ${hints.tone}`);
  }

  if (hints.difficulty) {
    sections.push(`- Target difficulty: ${hints.difficulty}`);
  }

  if (hints.style) {
    sections.push(`- Visual style: ${hints.style}`);
  }

  if (hints.avoid && hints.avoid.length > 0) {
    sections.push(`- Avoid these themes: ${hints.avoid.join(', ')}`);
  }

  return `## USER PREFERENCES

The user has provided these hints (incorporate them naturally):

${sections.join('\n')}`;
}

/**
 * GameSpec schema definition
 */
function getGameSpecSchema(): string {
  return `## OUTPUT FORMAT (STRICT JSON)

You MUST return a single JSON object matching this EXACT TypeScript interface:

\`\`\`typescript
interface GameSpec {
  // Identity
  id: string;             // Unique slug (lowercase, hyphens, e.g., "gravity-flip-runner")
  name: string;           // Game title (e.g., "Gravity Flip Runner")
  highConcept: string;    // 1-2 sentence pitch
  tags: string[];         // 3-5 simple tags (e.g., ["arcade", "physics", "challenging"])

  // Game mechanics
  mechanics: {
    genre: string;        // Freeform genre description (e.g., "physics-based puzzle platformer")
    camera: "fixed" | "vertical_scroll" | "horizontal_scroll";
    controls: ("tap" | "double_tap" | "long_press" | "drag" | "swipe" | "virtual_buttons")[];
    coreLoop: string;     // 2-3 sentences describing what player repeatedly does
    winCondition: string; // Clear, specific win condition
    loseCondition: string; // Clear, specific lose condition
    entities: Array<{
      name: string;       // Entity name (e.g., "Player Bubble", "Spike Trap")
      role: "player" | "enemy" | "obstacle" | "pickup";
      behavior: string;   // 1-2 sentences describing behavior
    }>;
    scoring: {
      primaryMetric: string; // e.g., "points", "time", "distance"
      description: string;   // How scoring works
    };
  };

  // Visual theme
  visualTheme: {
    mood: string;         // e.g., "zen minimalist garden", "dark gothic cathedral"
    paletteHint: {
      primary: string;    // Main color (hex or name)
      secondary: string;  // Secondary color
      accent: string;     // Accent/highlight color
      background: string; // Background color
    };
    uiStyle: string;      // e.g., "rounded soft shadows", "sharp angular geometric"
    fontStyleHint: string; // e.g., "elegant serif", "chunky display font"
    iconographyHint: string; // e.g., "nature symbols", "tech circuit patterns"
  };

  // Levels (ALWAYS 10)
  levels: Array<{
    id: number;           // 1 through 10
    name: string;         // Level name
    difficulty: "easy" | "medium" | "hard" | "very_hard";
    shortDescription: string; // 1 sentence description
    parameters: {         // Game-specific parameters (use meaningful keys)
      [key: string]: number | string;
    };
  }>;
}
\`\`\`

## IMPORTANT RULES:

1. Generate EXACTLY 10 levels with sequential IDs (1 through 10)
2. Level difficulties should generally increase (early levels easier, later levels harder)
3. The \`parameters\` object should contain game-specific values (e.g., speed, enemy count, time limit)
4. Make sure mechanics and visualTheme work together cohesively
5. Ensure entities have clear, distinct roles and behaviors
6. Make win/lose conditions specific and testable`;
}

/**
 * Example GameSpecs for reference
 */
function getExamples(): string {
  return `## EXAMPLES (For Reference Only - DO NOT Copy)

Here are examples of well-designed GameSpecs to show the format and quality expected:

### Example 1: Gravity Flip Platformer

\`\`\`json
{
  "id": "gravity-flip-escape",
  "name": "Gravity Flip Escape",
  "highConcept": "Platformer where you flip gravity to navigate upside-down levels. Avoid spikes and reach the exit portal.",
  "tags": ["platformer", "physics", "puzzle", "challenging"],
  "mechanics": {
    "genre": "Gravity-flipping precision platformer",
    "camera": "horizontal_scroll",
    "controls": ["tap"],
    "coreLoop": "Player runs automatically. Tap to flip gravity (walk on ceiling). Navigate obstacles and reach exit.",
    "winCondition": "Reach the exit portal",
    "loseCondition": "Touch spikes or fall off screen",
    "entities": [
      {
        "name": "Player Character",
        "role": "player",
        "behavior": "Runs automatically forward. Flips gravity on tap, walking on floor or ceiling."
      },
      {
        "name": "Spike Hazard",
        "role": "obstacle",
        "behavior": "Static spikes on floor and ceiling that kill player on contact."
      },
      {
        "name": "Exit Portal",
        "role": "pickup",
        "behavior": "End goal. Touching it completes the level."
      }
    ],
    "scoring": {
      "primaryMetric": "time",
      "description": "Faster completion gives higher star rating (3 stars under 30s, 2 stars under 60s, 1 star otherwise)"
    }
  },
  "visualTheme": {
    "mood": "minimalist geometric monochrome",
    "paletteHint": {
      "primary": "#000000",
      "secondary": "#FFFFFF",
      "accent": "#FF0000",
      "background": "#CCCCCC"
    },
    "uiStyle": "clean lines, sharp corners, high contrast",
    "fontStyleHint": "bold geometric sans-serif",
    "iconographyHint": "simple geometric shapes"
  },
  "levels": [
    {
      "id": 1,
      "name": "First Flip",
      "difficulty": "easy",
      "shortDescription": "Learn to flip gravity",
      "parameters": { "length": 200, "spikes": 5, "timeLimit": 60 }
    }
    // ... levels 2-10 with increasing difficulty
  ]
}
\`\`\`

### Example 2: Circular Rhythm Dodger

\`\`\`json
{
  "id": "orbit-rhythm-dash",
  "name": "Orbit Rhythm Dash",
  "highConcept": "Orbit around a central planet, tapping to jump over incoming obstacles in rhythm. Collect stars for points.",
  "tags": ["rhythm", "arcade", "circular", "music"],
  "mechanics": {
    "genre": "Rhythm-based circular runner",
    "camera": "fixed",
    "controls": ["tap"],
    "coreLoop": "Player orbits automatically. Tap in rhythm to jump over obstacles. Chain jumps for multiplier.",
    "winCondition": "Survive until music ends and reach target score",
    "loseCondition": "Miss 3 jumps (hit obstacles)",
    "entities": [
      {
        "name": "Orbiting Player",
        "role": "player",
        "behavior": "Automatically orbits around center. Jumps on tap."
      },
      {
        "name": "Barrier Block",
        "role": "obstacle",
        "behavior": "Appears on orbit path in rhythm with music."
      },
      {
        "name": "Star Collectible",
        "role": "pickup",
        "behavior": "Bonus stars appear between obstacles for extra points."
      }
    ],
    "scoring": {
      "primaryMetric": "points",
      "description": "Points for each successful jump. Combo multiplier increases with consecutive perfect jumps."
    }
  },
  "visualTheme": {
    "mood": "cosmic dreamlike space",
    "paletteHint": {
      "primary": "#9B59B6",
      "secondary": "#3498DB",
      "accent": "#F39C12",
      "background": "#1A1A2E"
    },
    "uiStyle": "soft glowing orbs, particle effects, smooth gradients",
    "fontStyleHint": "rounded friendly sans-serif",
    "iconographyHint": "celestial symbols (stars, planets, moons)"
  },
  "levels": [
    {
      "id": 1,
      "name": "Slow Orbit",
      "difficulty": "easy",
      "shortDescription": "Learn the rhythm",
      "parameters": { "bpm": 80, "obstacles": 20, "duration": 60 }
    }
    // ... levels 2-10 with increasing BPM and obstacle density
  ]
}
\`\`\``;
}

/**
 * Output instructions
 */
function getOutputInstructions(): string {
  return `## OUTPUT INSTRUCTIONS (CRITICAL)

1. Respond with ONLY the JSON object
2. Do NOT include markdown code blocks (\`\`\`)
3. Do NOT include any explanatory text before or after the JSON
4. Ensure the JSON is valid and parseable
5. Double-check that all required fields are present
6. Make sure the game is:
   - Original and different from previous games
   - Implementable with simple 2D logic
   - Fun and engaging for mobile players
   - Visually cohesive (mechanics and theme match)
   - Has clear progression (levels 1-10 increase in difficulty)

Now, design an amazing new mobile 2D game. Be creative!`;
}

/**
 * Parse LLM response into GameSpec
 */
export function parseGameSpecResponse(response: string): GameSpec {
  // Remove any markdown code blocks if present
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```json?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Parse JSON
  const parsed = JSON.parse(cleaned);

  // Add metadata
  parsed.createdAt = new Date();
  parsed.version = '1.0.0';

  return parsed as GameSpec;
}

/**
 * Build a simplified prompt for testing
 */
export function buildSimpleGameSpecPrompt(theme: string): string {
  return `Design a mobile 2D game with theme: "${theme}".

Return valid JSON matching this structure (no markdown, just JSON):

{
  "id": "game-slug",
  "name": "Game Name",
  "highConcept": "One sentence pitch",
  "tags": ["tag1", "tag2"],
  "mechanics": {
    "genre": "genre description",
    "camera": "fixed",
    "controls": ["tap"],
    "coreLoop": "What player does",
    "winCondition": "How to win",
    "loseCondition": "How to lose",
    "entities": [
      {"name": "Player", "role": "player", "behavior": "behavior"},
      {"name": "Enemy", "role": "enemy", "behavior": "behavior"}
    ],
    "scoring": {"primaryMetric": "points", "description": "How scoring works"}
  },
  "visualTheme": {
    "mood": "${theme}",
    "paletteHint": {"primary": "#000000", "secondary": "#FFFFFF", "accent": "#FF0000", "background": "#CCCCCC"},
    "uiStyle": "style description",
    "fontStyleHint": "font style",
    "iconographyHint": "icon style"
  },
  "levels": [
    {"id": 1, "name": "Level 1", "difficulty": "easy", "shortDescription": "desc", "parameters": {"param1": 1}}
  ]
}`;
}
