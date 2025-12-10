/**
 * Game Logic Tests
 * Tests for core game functionality
 */

import { 
  LEVELS, 
  getLevelById, 
  getNextLevel, 
  getTotalLevels,
  getPlayableLevels,
  getLockedLevels,
  isLevelPlayable,
  isLevelUnlocked
} from '../app/config/levels';

describe('Level Configuration', () => {
  it('should have 10 levels defined', () => {
    expect(LEVELS).toHaveLength(10);
  });

  it('should have exactly 3 playable levels', () => {
    const playable = getPlayableLevels();
    expect(playable).toHaveLength(3);
    expect(playable.map(l => l.id)).toEqual([1, 2, 3]);
  });

  it('should have exactly 7 locked levels', () => {
    const locked = getLockedLevels();
    expect(locked).toHaveLength(7);
    expect(locked.every(l => l.comingSoon)).toBe(true);
  });

  it('should mark levels 1-3 as playable', () => {
    expect(isLevelPlayable(1)).toBe(true);
    expect(isLevelPlayable(2)).toBe(true);
    expect(isLevelPlayable(3)).toBe(true);
  });

  it('should mark levels 4-10 as not playable', () => {
    for (let i = 4; i <= 10; i++) {
      expect(isLevelPlayable(i)).toBe(false);
    }
  });

  it('should mark levels 4-10 as coming soon', () => {
    for (let i = 4; i <= 10; i++) {
      const level = getLevelById(i);
      expect(level?.comingSoon).toBe(true);
    }
  });

  it('should get level by id', () => {
    const level1 = getLevelById(1);
    expect(level1).toBeDefined();
    expect(level1?.id).toBe(1);
    expect(level1?.name).toBe('Getting Started');
  });

  it('should return undefined for invalid level id', () => {
    const invalidLevel = getLevelById(999);
    expect(invalidLevel).toBeUndefined();
  });

  it('should get next level', () => {
    const nextLevel = getNextLevel(1);
    expect(nextLevel).toBeDefined();
    expect(nextLevel?.id).toBe(2);
  });

  it('should return undefined when no next level exists', () => {
    const nextLevel = getNextLevel(3);
    expect(nextLevel).toBeUndefined();
  });

  it('should return correct total levels count', () => {
    const total = getTotalLevels();
    expect(total).toBe(10);
  });

  it('should have progressive difficulty', () => {
    expect(LEVELS[0].difficulty).toBe('easy');
    expect(LEVELS[1].difficulty).toBe('medium');
    expect(LEVELS[2].difficulty).toBe('hard');
  });

  it('should have increasing target scores', () => {
    expect(LEVELS[0].targetScore).toBeLessThan(LEVELS[1].targetScore);
    expect(LEVELS[1].targetScore).toBeLessThan(LEVELS[2].targetScore);
  });

  it('should have decreasing time limits', () => {
    expect(LEVELS[0].timeLimit).toBeGreaterThan(LEVELS[1].timeLimit);
    expect(LEVELS[1].timeLimit).toBeGreaterThan(LEVELS[2].timeLimit);
  });
});

describe('Game State Logic', () => {
  it('should calculate coins correctly', () => {
    const score = 250;
    const coins = Math.floor(score / 10);
    expect(coins).toBe(25);
  });

  it('should handle zero score', () => {
    const score = 0;
    const coins = Math.floor(score / 10);
    expect(coins).toBe(0);
  });

  it('should handle partial coin calculation', () => {
    const score = 155;
    const coins = Math.floor(score / 10);
    expect(coins).toBe(15); // Not 15.5
  });
});

describe('Level Unlock Logic', () => {
  it('should have level 1 always unlocked', () => {
    expect(isLevelUnlocked(1, [])).toBe(true);
  });

  it('should unlock level 2 when level 1 is completed', () => {
    expect(isLevelUnlocked(2, [1])).toBe(true);
    expect(isLevelUnlocked(2, [])).toBe(false);
  });

  it('should unlock level 3 when level 2 is completed', () => {
    expect(isLevelUnlocked(3, [1, 2])).toBe(true);
    expect(isLevelUnlocked(3, [1])).toBe(false);
  });

  it('should not unlock non-playable levels', () => {
    expect(isLevelUnlocked(4, [1, 2, 3])).toBe(false);
    expect(isLevelUnlocked(10, [1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(false);
  });
});

describe('Level Completion Logic', () => {
  it('should complete level when score meets target', () => {
    const level = LEVELS[0];
    const score = 100;
    const isComplete = score >= level.targetScore;
    expect(isComplete).toBe(true);
  });

  it('should not complete level when score is below target', () => {
    const level = LEVELS[0];
    const score = 50;
    const isComplete = score >= level.targetScore;
    expect(isComplete).toBe(false);
  });

  it('should complete level when score exceeds target', () => {
    const level = LEVELS[0];
    const score = 200;
    const isComplete = score >= level.targetScore;
    expect(isComplete).toBe(true);
  });
});
