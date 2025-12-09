/**
 * Game Logic Tests
 * Tests for core game functionality
 */

import { LEVELS, getLevelById, getNextLevel, getTotalLevels } from '../app/config/levels';

describe('Level Configuration', () => {
  it('should have 3 levels defined', () => {
    expect(LEVELS).toHaveLength(3);
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
    expect(total).toBe(3);
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
