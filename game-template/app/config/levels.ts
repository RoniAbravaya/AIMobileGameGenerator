/**
 * Level configuration for the game
 * This file defines all game levels with their properties
 * 
 * MVP: Levels 1-3 are playable, Levels 4-10 show as "Coming Soon"
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
  isPlayable: boolean; // true = can be played, false = locked
  comingSoon: boolean; // true = shows "Coming Soon" badge
}

export const LEVELS: Level[] = [
  // Playable Levels (1-3)
  {
    id: 1,
    name: 'Getting Started',
    difficulty: 'easy',
    timeLimit: 60,
    targetScore: 100,
    obstacles: 5,
    powerUps: 3,
    coinValue: 10,
    background: '#87CEEB',
    isPlayable: true,
    comingSoon: false
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
    background: '#FFB347',
    isPlayable: true,
    comingSoon: false
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
    background: '#FF6961',
    isPlayable: true,
    comingSoon: false
  },
  // Coming Soon Levels (4-10)
  {
    id: 4,
    name: 'Advanced Trial',
    difficulty: 'hard',
    timeLimit: 30,
    targetScore: 400,
    obstacles: 25,
    powerUps: 1,
    coinValue: 25,
    background: '#9B59B6',
    isPlayable: false,
    comingSoon: true
  },
  {
    id: 5,
    name: 'Speed Run',
    difficulty: 'hard',
    timeLimit: 20,
    targetScore: 350,
    obstacles: 30,
    powerUps: 1,
    coinValue: 30,
    background: '#E74C3C',
    isPlayable: false,
    comingSoon: true
  },
  {
    id: 6,
    name: 'Master Class',
    difficulty: 'hard',
    timeLimit: 25,
    targetScore: 500,
    obstacles: 35,
    powerUps: 0,
    coinValue: 35,
    background: '#1ABC9C',
    isPlayable: false,
    comingSoon: true
  },
  {
    id: 7,
    name: 'Nightmare Mode',
    difficulty: 'hard',
    timeLimit: 20,
    targetScore: 600,
    obstacles: 40,
    powerUps: 0,
    coinValue: 40,
    background: '#34495E',
    isPlayable: false,
    comingSoon: true
  },
  {
    id: 8,
    name: 'Epic Journey',
    difficulty: 'hard',
    timeLimit: 40,
    targetScore: 700,
    obstacles: 45,
    powerUps: 2,
    coinValue: 45,
    background: '#16A085',
    isPlayable: false,
    comingSoon: true
  },
  {
    id: 9,
    name: 'Ultimate Test',
    difficulty: 'hard',
    timeLimit: 35,
    targetScore: 800,
    obstacles: 50,
    powerUps: 1,
    coinValue: 50,
    background: '#2C3E50',
    isPlayable: false,
    comingSoon: true
  },
  {
    id: 10,
    name: 'Legendary',
    difficulty: 'hard',
    timeLimit: 50,
    targetScore: 1000,
    obstacles: 60,
    powerUps: 2,
    coinValue: 60,
    background: '#8E44AD',
    isPlayable: false,
    comingSoon: true
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

export function getPlayableLevels(): Level[] {
  return LEVELS.filter(level => level.isPlayable);
}

export function getLockedLevels(): Level[] {
  return LEVELS.filter(level => !level.isPlayable);
}

export function isLevelPlayable(levelId: number): boolean {
  const level = getLevelById(levelId);
  return level ? level.isPlayable : false;
}

export function isLevelUnlocked(levelId: number, completedLevelIds: number[]): boolean {
  const level = getLevelById(levelId);
  if (!level || !level.isPlayable) return false;
  
  // Level 1 is always unlocked
  if (levelId === 1) return true;
  
  // Other levels unlock when previous level is completed
  return completedLevelIds.includes(levelId - 1);
}
