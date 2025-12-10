/**
 * Game Screen
 * Main gameplay screen with game engine
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert
} from 'react-native';
import Constants from 'expo-constants';
import { getLevelById, Level } from '../config/levels';
import { useGameState } from '../hooks/useGameState';
import { useAds } from '../hooks/useAds';
import { GameEngineFactory } from '../game/GameEngineFactory';
import { GameType } from '../game/config/gameTypes';

interface GameScreenProps {
  levelId: number;
  onLevelComplete: () => void;
  onGameOver: () => void;
  onExit: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  levelId,
  onLevelComplete,
  onGameOver,
  onExit
}) => {
  const level = getLevelById(levelId);
  const { state, updateScore, loseLife, completeLevel, setPaused } = useGameState();
  const { showInterstitial } = useAds();
  
  // Get game type from app config
  const gameType = (Constants.expoConfig?.extra?.gameType as GameType) || GameType.RUNNER;

  const [currentScore, setCurrentScore] = useState(0);
  const [currentLives, setCurrentLives] = useState(state.lives);

  // Handle win
  const handleWin = async () => {
    if (!level) return;

    const coinsEarned = Math.floor(currentScore / 10);
    await completeLevel(currentScore, coinsEarned);

    setTimeout(() => {
      Alert.alert(
        'Level Complete! 🎉',
        `Score: ${currentScore}\nCoins: ${coinsEarned}`,
        [
          {
            text: 'Continue',
            onPress: () => {
              showInterstitial(); // Show ad between levels
              onLevelComplete();
            }
          }
        ]
      );
    }, 500);
  };

  // Handle lose
  const handleLose = () => {
    loseLife();

    setTimeout(() => {
      if (state.lives <= 1) {
        Alert.alert(
          'Game Over',
          `Final Score: ${currentScore}`,
          [{ text: 'OK', onPress: onGameOver }]
        );
      } else {
        Alert.alert(
          'Failed!',
          `Score: ${currentScore}\nLives remaining: ${state.lives - 1}`,
          [{ text: 'Retry', onPress: onExit }]
        );
      }
    }, 500);
  };

  // Handle pause
  const handlePause = () => {
    setPaused(true);
    Alert.alert(
      'Paused',
      'Game is paused',
      [
        { text: 'Resume', onPress: () => setPaused(false) },
        { text: 'Exit', onPress: onExit, style: 'destructive' }
      ]
    );
  };

  // Handle score changes from game engine
  const handleScoreChange = (newScore: number) => {
    setCurrentScore(newScore);
    updateScore(newScore);
  };

  // Handle lives changes from game engine
  const handleLivesChange = (newLives: number) => {
    setCurrentLives(newLives);
  };

  if (!level) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Level not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Pause Button Overlay */}
      <View style={styles.pauseOverlay}>
        <TouchableOpacity onPress={handlePause} style={styles.pauseButton}>
          <Text style={styles.pauseText}>⏸ Pause</Text>
        </TouchableOpacity>
      </View>

      {/* Game Engine */}
      <GameEngineFactory
        gameType={gameType}
        level={level}
        onScoreChange={handleScoreChange}
        onLivesChange={handleLivesChange}
        onWin={handleWin}
        onLose={handleLose}
        isPaused={state.isPaused}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  },
  pauseOverlay: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000
  },
  pauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  pauseText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold'
  },
  errorText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginTop: 50
  }
});

export default GameScreen;
