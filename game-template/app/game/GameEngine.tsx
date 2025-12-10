/**
 * Game Engine Interface
 * Base interface that all game type engines must implement
 */

import { Level } from '../config/levels';

export interface GameState {
  score: number;
  lives: number;
  timeRemaining: number;
  isPaused: boolean;
  isGameOver: boolean;
  isWin: boolean;
}

export interface GameEngineProps {
  level: Level;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onWin: () => void;
  onLose: () => void;
  isPaused: boolean;
}

export interface IGameEngine {
  // Lifecycle
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  
  // State
  getState(): GameState;
  
  // Input handling (for different control schemes)
  handleInput(input: any): void;
}
