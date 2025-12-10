/**
 * Game Type System
 * Defines all supported game types and their configurations
 */

export enum GameType {
  RUNNER = 'runner',
  PLATFORMER = 'platformer',
  PUZZLE = 'puzzle',
  WORD = 'word',
  CARD = 'card'
}

export interface GameTypeTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textSecondary: string;
  };
  fonts: {
    title: string;
    body: string;
    size: {
      small: number;
      medium: number;
      large: number;
      xlarge: number;
    };
  };
  animations: {
    speed: 'slow' | 'medium' | 'fast';
    easing: 'linear' | 'ease' | 'bounce';
  };
  imagePromptKeywords: string[]; // For AI image generation
}

export interface GameTypeConfig {
  type: GameType;
  displayName: string;
  description: string;
  theme: GameTypeTheme;
  mechanics: {
    playerControl: string;
    winCondition: string;
    loseCondition: string;
    scoring: string;
  };
  levelParameters: {
    [key: string]: any;
  };
}

// Runner Game Type - Neon Cyber Theme
export const RUNNER_CONFIG: GameTypeConfig = {
  type: GameType.RUNNER,
  displayName: 'Neon Runner',
  description: 'Fast-paced endless runner with neon aesthetic',
  theme: {
    name: 'Neon Cyber',
    colors: {
      primary: '#00ffff', // Cyan
      secondary: '#ff00ff', // Magenta
      accent: '#39ff14', // Neon green
      background: '#0a0e27',
      text: '#ffffff',
      textSecondary: '#00ffff'
    },
    fonts: {
      title: 'Orbitron',
      body: 'Rajdhani',
      size: {
        small: 14,
        medium: 18,
        large: 28,
        xlarge: 42
      }
    },
    animations: {
      speed: 'fast',
      easing: 'linear'
    },
    imagePromptKeywords: ['neon', 'cyber', 'futuristic', 'high contrast', 'city lights', 'digital']
  },
  mechanics: {
    playerControl: 'Tap to jump/dodge',
    winCondition: 'Reach target score or distance',
    loseCondition: 'Run out of lives from collisions',
    scoring: 'Points for distance traveled and items collected'
  },
  levelParameters: {
    scrollSpeed: 5,
    obstacleFrequency: 0.02,
    coinFrequency: 0.05
  }
};

// Puzzle Game Type - Zen Theme
export const PUZZLE_CONFIG: GameTypeConfig = {
  type: GameType.PUZZLE,
  displayName: 'Zen Puzzle',
  description: 'Relaxing match-3 puzzle game',
  theme: {
    name: 'Zen Minimal',
    colors: {
      primary: '#e8d5b7', // Warm beige
      secondary: '#b8d4e3', // Soft blue
      accent: '#d4e8d4', // Mint
      background: '#f5f5f0',
      text: '#3d3d3d',
      textSecondary: '#7a7a7a'
    },
    fonts: {
      title: 'Lato',
      body: 'Open Sans',
      size: {
        small: 12,
        medium: 16,
        large: 24,
        xlarge: 36
      }
    },
    animations: {
      speed: 'slow',
      easing: 'ease'
    },
    imagePromptKeywords: ['zen', 'minimal', 'peaceful', 'pastel', 'nature', 'calm']
  },
  mechanics: {
    playerControl: 'Tap tiles to swap and match',
    winCondition: 'Reach target score',
    loseCondition: 'Time runs out or no valid moves',
    scoring: 'Points for matches, combos, and cascades'
  },
  levelParameters: {
    gridSize: { rows: 8, cols: 8 },
    tileTypes: 5,
    comboMultiplier: 1.5
  }
};

// Word Game Type - Clean Typography Theme
export const WORD_CONFIG: GameTypeConfig = {
  type: GameType.WORD,
  displayName: 'Word Tower',
  description: 'Vertical word puzzle game',
  theme: {
    name: 'Clean Typography',
    colors: {
      primary: '#2c3e50', // Dark blue
      secondary: '#3498db', // Bright blue
      accent: '#e74c3c', // Red accent
      background: '#ecf0f1',
      text: '#2c3e50',
      textSecondary: '#7f8c8d'
    },
    fonts: {
      title: 'Montserrat',
      body: 'Roboto',
      size: {
        small: 14,
        medium: 20,
        large: 32,
        xlarge: 48
      }
    },
    animations: {
      speed: 'medium',
      easing: 'ease'
    },
    imagePromptKeywords: ['typography', 'letters', 'clean', 'modern', 'tower', 'stacked']
  },
  mechanics: {
    playerControl: 'Connect letters to form words',
    winCondition: 'Reach target score',
    loseCondition: 'Time runs out',
    scoring: 'Points based on word length and rarity'
  },
  levelParameters: {
    gridSize: { rows: 10, cols: 6 },
    minWordLength: 3,
    timeBonus: true
  }
};

// Card Game Type - Tabletop Theme
export const CARD_CONFIG: GameTypeConfig = {
  type: GameType.CARD,
  displayName: 'Card Duel',
  description: 'Strategic card game inspired by Pazaak',
  theme: {
    name: 'Tabletop',
    colors: {
      primary: '#0e5e3a', // Green felt
      secondary: '#8b4513', // Wood brown
      accent: '#ffd700', // Gold
      background: '#1a4d2e',
      text: '#ffffff',
      textSecondary: '#d4af37'
    },
    fonts: {
      title: 'Cinzel',
      body: 'Merriweather',
      size: {
        small: 14,
        medium: 18,
        large: 26,
        xlarge: 38
      }
    },
    animations: {
      speed: 'medium',
      easing: 'ease'
    },
    imagePromptKeywords: ['cards', 'tabletop', 'casino', 'elegant', 'gold accents', 'felt table']
  },
  mechanics: {
    playerControl: 'Select cards to play',
    winCondition: 'Reach exactly 20 or beat opponent',
    loseCondition: 'Bust over 20 or lose to opponent',
    scoring: 'Sum of card values'
  },
  levelParameters: {
    targetScore: 20,
    maxBust: 20,
    aiDifficulty: 'medium'
  }
};

// Platformer Game Type - Adventure Theme
export const PLATFORMER_CONFIG: GameTypeConfig = {
  type: GameType.PLATFORMER,
  displayName: 'Platform Adventure',
  description: 'Classic 2D platformer',
  theme: {
    name: 'Adventure',
    colors: {
      primary: '#87ceeb', // Sky blue
      secondary: '#90ee90', // Light green
      accent: '#ffa500', // Orange
      background: '#87ceeb',
      text: '#2c3e50',
      textSecondary: '#7f8c8d'
    },
    fonts: {
      title: 'Fredoka One',
      body: 'Nunito',
      size: {
        small: 14,
        medium: 18,
        large: 28,
        xlarge: 40
      }
    },
    animations: {
      speed: 'medium',
      easing: 'bounce'
    },
    imagePromptKeywords: ['adventure', 'cartoon', 'colorful', 'nature', 'platform', 'cheerful']
  },
  mechanics: {
    playerControl: 'Move left/right, jump',
    winCondition: 'Reach end of level',
    loseCondition: 'Fall into pit or run out of lives',
    scoring: 'Points for coins and enemies defeated'
  },
  levelParameters: {
    gravity: 0.8,
    jumpForce: 15,
    moveSpeed: 5
  }
};

// Master config map
export const GAME_TYPE_CONFIGS: Record<GameType, GameTypeConfig> = {
  [GameType.RUNNER]: RUNNER_CONFIG,
  [GameType.PLATFORMER]: PLATFORMER_CONFIG,
  [GameType.PUZZLE]: PUZZLE_CONFIG,
  [GameType.WORD]: WORD_CONFIG,
  [GameType.CARD]: CARD_CONFIG
};

export function getGameTypeConfig(type: GameType): GameTypeConfig {
  return GAME_TYPE_CONFIGS[type];
}

export function getAllGameTypes(): GameType[] {
  return Object.values(GameType);
}
