/**
 * GameSpec Model
 * Complete structured description of a unique mobile 2D game
 * 
 * This is the central data model that drives dynamic game generation.
 * Every generated game starts with an LLM-designed GameSpec.
 */

/**
 * Camera types for 2D games
 */
export type CameraType = 'fixed' | 'vertical_scroll' | 'horizontal_scroll';

/**
 * Allowed control inputs (mobile-friendly)
 */
export type ControlType = 'tap' | 'double_tap' | 'long_press' | 'drag' | 'swipe' | 'virtual_buttons';

/**
 * Entity roles in the game
 */
export type EntityRole = 'player' | 'enemy' | 'obstacle' | 'pickup';

/**
 * Level difficulty
 */
export type LevelDifficulty = 'easy' | 'medium' | 'hard' | 'very_hard';

/**
 * Entity definition
 */
export interface GameEntity {
  name: string;           // e.g., "Player Ship", "Asteroid", "Power-up Star"
  role: EntityRole;
  behavior: string;       // Freeform description of how it behaves
}

/**
 * Scoring system
 */
export interface ScoringSystem {
  primaryMetric: string;  // e.g., "distance", "points", "time"
  description: string;    // How scoring works
}

/**
 * Game mechanics definition
 */
export interface GameMechanics {
  genre: string;          // Freeform genre description (e.g., "gravity-flip platformer")
  camera: CameraType;
  controls: ControlType[];
  coreLoop: string;       // 1-3 sentences describing gameplay loop
  winCondition: string;   // Clear win condition
  loseCondition: string;  // Clear lose condition
  entities: GameEntity[];
  scoring: ScoringSystem;
}

/**
 * Color palette hint
 */
export interface ColorPalette {
  primary: string;        // Hex or color name
  secondary: string;
  accent: string;
  background: string;
}

/**
 * Visual theme definition
 */
export interface VisualTheme {
  mood: string;           // e.g., "neon cyberpunk", "pastel zen mountain", "dark retro pixel dungeon"
  paletteHint: ColorPalette;
  uiStyle: string;        // e.g., "rounded, floating cards, large shadows"
  fontStyleHint: string;  // e.g., "clean geometric", "retro pixel", "handwritten"
  iconographyHint: string; // e.g., "simple line icons", "bold filled shapes"
}

/**
 * Level definition
 */
export interface GameLevel {
  id: number;             // 1-10
  name: string;
  difficulty: LevelDifficulty;
  shortDescription: string;
  parameters: Record<string, number | string>; // Game-specific parameters
}

/**
 * Complete GameSpec
 */
export interface GameSpec {
  // Identity
  id: string;             // Unique identifier (slug or UUID)
  name: string;           // Game title (safe for use as folder/repo name)
  highConcept: string;    // 1-2 sentence pitch
  tags: string[];         // Simple tags (e.g., ["arcade", "fast", "neon"])
  
  // Game design
  mechanics: GameMechanics;
  visualTheme: VisualTheme;
  levels: GameLevel[];    // Always 10 levels
  
  // Metadata
  createdAt?: Date;
  version?: string;
}

/**
 * GameSpec validation result
 */
export interface GameSpecValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Helper functions for GameSpec
 */

/**
 * Validate a GameSpec structure
 */
export function validateGameSpec(spec: any): GameSpecValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required top-level fields
  if (!spec.id) errors.push('Missing required field: id');
  if (!spec.name) errors.push('Missing required field: name');
  if (!spec.highConcept) errors.push('Missing required field: highConcept');
  if (!spec.tags || !Array.isArray(spec.tags)) errors.push('Missing or invalid field: tags (must be array)');
  
  // Mechanics validation
  if (!spec.mechanics) {
    errors.push('Missing required field: mechanics');
  } else {
    if (!spec.mechanics.genre) errors.push('Missing mechanics.genre');
    if (!spec.mechanics.camera) errors.push('Missing mechanics.camera');
    if (!['fixed', 'vertical_scroll', 'horizontal_scroll'].includes(spec.mechanics.camera)) {
      errors.push(`Invalid camera type: ${spec.mechanics.camera}`);
    }
    if (!spec.mechanics.controls || !Array.isArray(spec.mechanics.controls)) {
      errors.push('Missing or invalid mechanics.controls (must be array)');
    }
    if (!spec.mechanics.coreLoop) errors.push('Missing mechanics.coreLoop');
    if (!spec.mechanics.winCondition) errors.push('Missing mechanics.winCondition');
    if (!spec.mechanics.loseCondition) errors.push('Missing mechanics.loseCondition');
    if (!spec.mechanics.entities || !Array.isArray(spec.mechanics.entities)) {
      errors.push('Missing or invalid mechanics.entities (must be array)');
    } else if (spec.mechanics.entities.length === 0) {
      warnings.push('No entities defined');
    }
    if (!spec.mechanics.scoring) errors.push('Missing mechanics.scoring');
  }
  
  // Visual theme validation
  if (!spec.visualTheme) {
    errors.push('Missing required field: visualTheme');
  } else {
    if (!spec.visualTheme.mood) errors.push('Missing visualTheme.mood');
    if (!spec.visualTheme.paletteHint) {
      errors.push('Missing visualTheme.paletteHint');
    } else {
      if (!spec.visualTheme.paletteHint.primary) errors.push('Missing paletteHint.primary');
      if (!spec.visualTheme.paletteHint.secondary) errors.push('Missing paletteHint.secondary');
      if (!spec.visualTheme.paletteHint.accent) errors.push('Missing paletteHint.accent');
      if (!spec.visualTheme.paletteHint.background) errors.push('Missing paletteHint.background');
    }
    if (!spec.visualTheme.uiStyle) warnings.push('Missing visualTheme.uiStyle');
    if (!spec.visualTheme.fontStyleHint) warnings.push('Missing visualTheme.fontStyleHint');
  }
  
  // Levels validation
  if (!spec.levels || !Array.isArray(spec.levels)) {
    errors.push('Missing or invalid field: levels (must be array)');
  } else {
    if (spec.levels.length !== 10) {
      errors.push(`Levels must be exactly 10, got ${spec.levels.length}`);
    }
    spec.levels.forEach((level: any, idx: number) => {
      if (!level.id) errors.push(`Level ${idx}: missing id`);
      if (!level.name) errors.push(`Level ${idx}: missing name`);
      if (!level.difficulty) errors.push(`Level ${idx}: missing difficulty`);
      if (!['easy', 'medium', 'hard', 'very_hard'].includes(level.difficulty)) {
        errors.push(`Level ${idx}: invalid difficulty ${level.difficulty}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create a safe slug from game name
 */
export function createGameSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Check if GameSpec is similar to another (for novelty detection)
 */
export function calculateSimilarity(spec1: GameSpec, spec2: GameSpec): number {
  let similarityScore = 0;
  let totalChecks = 0;

  // Compare tags
  const commonTags = spec1.tags.filter(tag => spec2.tags.includes(tag));
  similarityScore += (commonTags.length / Math.max(spec1.tags.length, spec2.tags.length)) * 20;
  totalChecks += 20;

  // Compare genre (simple word overlap)
  const words1 = spec1.mechanics.genre.toLowerCase().split(' ');
  const words2 = spec2.mechanics.genre.toLowerCase().split(' ');
  const commonWords = words1.filter(word => words2.includes(word));
  similarityScore += (commonWords.length / Math.max(words1.length, words2.length)) * 30;
  totalChecks += 30;

  // Compare camera type
  if (spec1.mechanics.camera === spec2.mechanics.camera) {
    similarityScore += 15;
  }
  totalChecks += 15;

  // Compare controls
  const commonControls = spec1.mechanics.controls.filter(c => spec2.mechanics.controls.includes(c));
  similarityScore += (commonControls.length / Math.max(spec1.mechanics.controls.length, spec2.mechanics.controls.length)) * 15;
  totalChecks += 15;

  // Compare mood
  const mood1Words = spec1.visualTheme.mood.toLowerCase().split(' ');
  const mood2Words = spec2.visualTheme.mood.toLowerCase().split(' ');
  const commonMoodWords = mood1Words.filter(word => mood2Words.includes(word));
  similarityScore += (commonMoodWords.length / Math.max(mood1Words.length, mood2Words.length)) * 20;
  totalChecks += 20;

  return (similarityScore / totalChecks) * 100;
}

/**
 * Find the most similar GameSpec from a list
 */
export function findMostSimilar(spec: GameSpec, candidates: GameSpec[]): { spec: GameSpec; similarity: number } | null {
  if (candidates.length === 0) return null;

  let mostSimilar = candidates[0];
  let highestSimilarity = calculateSimilarity(spec, mostSimilar);

  for (let i = 1; i < candidates.length; i++) {
    const similarity = calculateSimilarity(spec, candidates[i]);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      mostSimilar = candidates[i];
    }
  }

  return { spec: mostSimilar, similarity: highestSimilarity };
}

/**
 * Example GameSpec for reference
 */
export const EXAMPLE_GAMESPEC: GameSpec = {
  id: 'neon-dash-runner',
  name: 'Neon Dash Runner',
  highConcept: 'Fast-paced endless runner through a neon cyberpunk cityscape. Dodge obstacles and collect energy orbs.',
  tags: ['arcade', 'fast', 'neon', 'endless'],
  
  mechanics: {
    genre: 'Endless runner with lane-switching',
    camera: 'vertical_scroll',
    controls: ['swipe', 'tap'],
    coreLoop: 'Player automatically runs forward. Swipe left/right to switch lanes, tap to jump. Avoid obstacles, collect orbs for points.',
    winCondition: 'Reach target score or distance',
    loseCondition: 'Hit 3 obstacles (lose all lives)',
    entities: [
      {
        name: 'Player Runner',
        role: 'player',
        behavior: 'Runs automatically forward at constant speed, player controls lane switching and jumping'
      },
      {
        name: 'Obstacle Barrier',
        role: 'obstacle',
        behavior: 'Static barriers in lanes that damage player on collision'
      },
      {
        name: 'Energy Orb',
        role: 'pickup',
        behavior: 'Collectible orbs that increase score and speed'
      }
    ],
    scoring: {
      primaryMetric: 'score',
      description: 'Points increase based on distance traveled and orbs collected. Score multiplier increases with consecutive orb pickups.'
    }
  },
  
  visualTheme: {
    mood: 'neon cyberpunk futuristic',
    paletteHint: {
      primary: '#00ffff',     // Cyan
      secondary: '#ff00ff',   // Magenta
      accent: '#39ff14',      // Neon green
      background: '#0a0e27'   // Dark blue-black
    },
    uiStyle: 'sharp edges, glowing outlines, holographic elements',
    fontStyleHint: 'futuristic geometric sans-serif',
    iconographyHint: 'angular tech symbols with glow effects'
  },
  
  levels: [
    {
      id: 1,
      name: 'Tutorial Sprint',
      difficulty: 'easy',
      shortDescription: 'Learn the basics',
      parameters: { speed: 5, obstacleFrequency: 0.01, orbFrequency: 0.05 }
    },
    {
      id: 2,
      name: 'City Chase',
      difficulty: 'easy',
      shortDescription: 'Pick up the pace',
      parameters: { speed: 6, obstacleFrequency: 0.015, orbFrequency: 0.04 }
    },
    {
      id: 3,
      name: 'Neon Highway',
      difficulty: 'medium',
      shortDescription: 'Speed increases',
      parameters: { speed: 7, obstacleFrequency: 0.02, orbFrequency: 0.03 }
    },
    {
      id: 4,
      name: 'Data Stream',
      difficulty: 'medium',
      shortDescription: 'More obstacles',
      parameters: { speed: 8, obstacleFrequency: 0.025, orbFrequency: 0.025 }
    },
    {
      id: 5,
      name: 'Cyber District',
      difficulty: 'medium',
      shortDescription: 'Complex patterns',
      parameters: { speed: 9, obstacleFrequency: 0.03, orbFrequency: 0.02 }
    },
    {
      id: 6,
      name: 'Matrix Core',
      difficulty: 'hard',
      shortDescription: 'High speed challenge',
      parameters: { speed: 10, obstacleFrequency: 0.035, orbFrequency: 0.015 }
    },
    {
      id: 7,
      name: 'Digital Abyss',
      difficulty: 'hard',
      shortDescription: 'Expert reflexes required',
      parameters: { speed: 11, obstacleFrequency: 0.04, orbFrequency: 0.01 }
    },
    {
      id: 8,
      name: 'Quantum Tunnel',
      difficulty: 'hard',
      shortDescription: 'Maximum velocity',
      parameters: { speed: 12, obstacleFrequency: 0.045, orbFrequency: 0.01 }
    },
    {
      id: 9,
      name: 'Singularity Rush',
      difficulty: 'very_hard',
      shortDescription: 'Almost impossible',
      parameters: { speed: 13, obstacleFrequency: 0.05, orbFrequency: 0.005 }
    },
    {
      id: 10,
      name: 'Beyond Reality',
      difficulty: 'very_hard',
      shortDescription: 'The ultimate test',
      parameters: { speed: 15, obstacleFrequency: 0.06, orbFrequency: 0.005 }
    }
  ],
  
  createdAt: new Date(),
  version: '1.0.0'
};
