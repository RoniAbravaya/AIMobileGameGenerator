/**
 * Level configuration for the game
 * This file defines all game levels with their properties
 */

export interface Level {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // seconds
  targetScore: number;
  obstacles: number;
  powerUps: number;
  coinValue: number;
  background: string;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Getting Started',
    difficulty: 'easy',
    timeLimit: 60,
    targetScore: 100,
    obstacles: 5,
    powerUps: 3,
    coinValue: 10,
    background: '#87CEEB'
  },
  {
    id: 2,
    name: 'Level Up',
    difficulty: 'medium',
    timeLimit: 45,
    targetScore: 200,
    obstacles: 10,
    powerUps: 2,
    coinValue: 15,
    background: '#FFB347'
  },
  {
    id: 3,
    name: 'Expert Challenge',
    difficulty: 'hard',
    timeLimit: 30,
    targetScore: 300,
    obstacles: 20,
    powerUps: 1,
    coinValue: 20,
    background: '#FF6961'
  }
];

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find(level => level.id === id);
}

export function getNextLevel(currentLevelId: number): Level | undefined {
  return LEVELS.find(level => level.id === currentLevelId + 1);
}

export function getTotalLevels(): number {
  return LEVELS.length;
}
