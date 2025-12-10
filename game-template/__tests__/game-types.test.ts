/**
 * Game Types Tests
 * Tests for game type system and configurations
 */

import {
  GameType,
  GAME_TYPE_CONFIGS,
  getGameTypeConfig,
  getAllGameTypes,
  RUNNER_CONFIG,
  PUZZLE_CONFIG,
  WORD_CONFIG,
  CARD_CONFIG,
  PLATFORMER_CONFIG
} from '../app/game/config/gameTypes';

describe('Game Type System', () => {
  it('should have 5 game types defined', () => {
    const types = getAllGameTypes();
    expect(types).toHaveLength(5);
  });

  it('should include all expected game types', () => {
    const types = getAllGameTypes();
    expect(types).toContain(GameType.RUNNER);
    expect(types).toContain(GameType.PUZZLE);
    expect(types).toContain(GameType.WORD);
    expect(types).toContain(GameType.CARD);
    expect(types).toContain(GameType.PLATFORMER);
  });

  it('should get config for each game type', () => {
    const runnerConfig = getGameTypeConfig(GameType.RUNNER);
    expect(runnerConfig).toBeDefined();
    expect(runnerConfig.type).toBe(GameType.RUNNER);

    const puzzleConfig = getGameTypeConfig(GameType.PUZZLE);
    expect(puzzleConfig).toBeDefined();
    expect(puzzleConfig.type).toBe(GameType.PUZZLE);
  });

  it('should have unique themes for each game type', () => {
    const themes = getAllGameTypes().map(type => 
      getGameTypeConfig(type).theme.name
    );
    const uniqueThemes = new Set(themes);
    expect(uniqueThemes.size).toBe(themes.length);
  });

  it('should have different color schemes for each game type', () => {
    const runnerColors = RUNNER_CONFIG.theme.colors.primary;
    const puzzleColors = PUZZLE_CONFIG.theme.colors.primary;
    const wordColors = WORD_CONFIG.theme.colors.primary;
    
    expect(runnerColors).not.toBe(puzzleColors);
    expect(puzzleColors).not.toBe(wordColors);
    expect(runnerColors).not.toBe(wordColors);
  });

  it('should have image prompt keywords for each type', () => {
    getAllGameTypes().forEach(type => {
      const config = getGameTypeConfig(type);
      expect(config.theme.imagePromptKeywords).toBeDefined();
      expect(config.theme.imagePromptKeywords.length).toBeGreaterThan(0);
    });
  });

  it('should have mechanics defined for each type', () => {
    getAllGameTypes().forEach(type => {
      const config = getGameTypeConfig(type);
      expect(config.mechanics.playerControl).toBeDefined();
      expect(config.mechanics.winCondition).toBeDefined();
      expect(config.mechanics.loseCondition).toBeDefined();
      expect(config.mechanics.scoring).toBeDefined();
    });
  });
});

describe('Runner Configuration', () => {
  it('should have neon cyber theme', () => {
    expect(RUNNER_CONFIG.theme.name).toBe('Neon Cyber');
    expect(RUNNER_CONFIG.theme.colors.primary).toBe('#00ffff'); // Cyan
  });

  it('should have fast animation speed', () => {
    expect(RUNNER_CONFIG.theme.animations.speed).toBe('fast');
  });

  it('should have neon keywords', () => {
    expect(RUNNER_CONFIG.theme.imagePromptKeywords).toContain('neon');
    expect(RUNNER_CONFIG.theme.imagePromptKeywords).toContain('cyber');
  });
});

describe('Puzzle Configuration', () => {
  it('should have zen minimal theme', () => {
    expect(PUZZLE_CONFIG.theme.name).toBe('Zen Minimal');
  });

  it('should have slow animation speed', () => {
    expect(PUZZLE_CONFIG.theme.animations.speed).toBe('slow');
  });

  it('should have zen keywords', () => {
    expect(PUZZLE_CONFIG.theme.imagePromptKeywords).toContain('zen');
    expect(PUZZLE_CONFIG.theme.imagePromptKeywords).toContain('minimal');
  });
});

describe('Word Configuration', () => {
  it('should have clean typography theme', () => {
    expect(WORD_CONFIG.theme.name).toBe('Clean Typography');
  });

  it('should have typography keywords', () => {
    expect(WORD_CONFIG.theme.imagePromptKeywords).toContain('typography');
  });
});

describe('Card Configuration', () => {
  it('should have tabletop theme', () => {
    expect(CARD_CONFIG.theme.name).toBe('Tabletop');
  });

  it('should have target score of 20', () => {
    expect(CARD_CONFIG.levelParameters.targetScore).toBe(20);
  });
});

describe('Platformer Configuration', () => {
  it('should have adventure theme', () => {
    expect(PLATFORMER_CONFIG.theme.name).toBe('Adventure');
  });

  it('should have bounce easing', () => {
    expect(PLATFORMER_CONFIG.theme.animations.easing).toBe('bounce');
  });
});
