/**
 * Game state management hook
 * Manages the core game state including lives, coins, score, and level progression
 */

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GameState {
  currentLevel: number;
  lives: number;
  coins: number;
  score: number;
  highScore: number;
  isPaused: boolean;
  isGameOver: boolean;
  completedLevels: number[];
}

const INITIAL_LIVES = 5;
const STORAGE_KEY = '@game_state';

export const useGameState = () => {
  const [state, setState] = useState<GameState>({
    currentLevel: 1,
    lives: INITIAL_LIVES,
    coins: 0,
    score: 0,
    highScore: 0,
    isPaused: false,
    isGameOver: false,
    completedLevels: []
  });

  // Load saved state
  const loadState = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          ...parsed,
          isPaused: false,
          isGameOver: false
        }));
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  }, []);

  // Save state
  const saveState = useCallback(async (newState: Partial<GameState>) => {
    try {
      const updated = { ...state, ...newState };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setState(updated);
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }, [state]);

  // Start a new level
  const startLevel = useCallback((levelId: number) => {
    setState(prev => ({
      ...prev,
      currentLevel: levelId,
      score: 0,
      isPaused: false,
      isGameOver: false
    }));
  }, []);

  // Complete current level
  const completeLevel = useCallback(async (levelScore: number, coinsEarned: number) => {
    setState(prev => {
      const newScore = prev.score + levelScore;
      const newHighScore = Math.max(prev.highScore, newScore);
      const newCoins = prev.coins + coinsEarned;
      const newCompletedLevels = [...prev.completedLevels];
      
      if (!newCompletedLevels.includes(prev.currentLevel)) {
        newCompletedLevels.push(prev.currentLevel);
      }

      const updated = {
        ...prev,
        score: newScore,
        highScore: newHighScore,
        coins: newCoins,
        completedLevels: newCompletedLevels
      };

      // Save to storage
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);

      return updated;
    });
  }, []);

  // Lose a life
  const loseLife = useCallback(() => {
    setState(prev => {
      const newLives = Math.max(0, prev.lives - 1);
      return {
        ...prev,
        lives: newLives,
        isGameOver: newLives === 0
      };
    });
  }, []);

  // Add coins
  const addCoins = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      coins: prev.coins + amount
    }));
  }, []);

  // Spend coins
  const spendCoins = useCallback((amount: number): boolean => {
    if (state.coins >= amount) {
      setState(prev => ({
        ...prev,
        coins: prev.coins - amount
      }));
      return true;
    }
    return false;
  }, [state.coins]);

  // Add lives (from purchase or reward)
  const addLives = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      lives: prev.lives + amount
    }));
  }, []);

  // Update score
  const updateScore = useCallback((points: number) => {
    setState(prev => ({
      ...prev,
      score: prev.score + points
    }));
  }, []);

  // Pause/resume
  const setPaused = useCallback((paused: boolean) => {
    setState(prev => ({
      ...prev,
      isPaused: paused
    }));
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentLevel: 1,
      lives: INITIAL_LIVES,
      score: 0,
      isPaused: false,
      isGameOver: false
    }));
  }, []);

  // Reset all progress
  const resetAllProgress = useCallback(async () => {
    const newState: GameState = {
      currentLevel: 1,
      lives: INITIAL_LIVES,
      coins: 0,
      score: 0,
      highScore: 0,
      isPaused: false,
      isGameOver: false,
      completedLevels: []
    };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  }, []);

  return {
    state,
    loadState,
    saveState,
    startLevel,
    completeLevel,
    loseLife,
    addCoins,
    spendCoins,
    addLives,
    updateScore,
    setPaused,
    resetGame,
    resetAllProgress
  };
};
