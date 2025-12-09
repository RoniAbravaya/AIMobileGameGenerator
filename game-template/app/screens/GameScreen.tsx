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
import { getLevelById, Level } from '../config/levels';
import { useGameState } from '../hooks/useGameState';
import { useAds } from '../hooks/useAds';

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

  const [timeRemaining, setTimeRemaining] = useState(level?.timeLimit || 60);
  const [currentScore, setCurrentScore] = useState(0);
  const [gameActive, setGameActive] = useState(true);

  // Timer countdown
  useEffect(() => {
    if (!gameActive || state.isPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, state.isPaused]);

  // Handle time up
  const handleTimeUp = () => {
    setGameActive(false);
    if (level && currentScore >= level.targetScore) {
      handleWin();
    } else {
      handleLose();
    }
  };

  // Handle win
  const handleWin = async () => {
    if (!level) return;

    const coinsEarned = Math.floor(currentScore / 10);
    await completeLevel(currentScore, coinsEarned);

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
  };

  // Handle lose
  const handleLose = () => {
    loseLife();

    if (state.lives <= 1) {
      Alert.alert(
        'Game Over',
        `Final Score: ${currentScore}`,
        [{ text: 'OK', onPress: onGameOver }]
      );
    } else {
      Alert.alert(
        'Time Up!',
        `Score: ${currentScore}\nLives remaining: ${state.lives - 1}`,
        [{ text: 'Retry', onPress: onExit }]
      );
    }
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

  // Simulate collecting a coin
  const collectCoin = () => {
    if (!level || !gameActive || state.isPaused) return;
    
    const points = level.coinValue;
    setCurrentScore((prev) => prev + points);
    updateScore(points);
  };

  if (!level) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Level not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: level.background }]}>
      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>Time</Text>
          <Text style={styles.hudValue}>{timeRemaining}s</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>Score</Text>
          <Text style={styles.hudValue}>{currentScore}/{level.targetScore}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>Lives</Text>
          <Text style={styles.hudValue}>❤️ {state.lives}</Text>
        </View>
        <TouchableOpacity onPress={handlePause} style={styles.pauseButton}>
          <Text style={styles.pauseText}>⏸</Text>
        </TouchableOpacity>
      </View>

      {/* Game Area - Placeholder for actual game engine */}
      <View style={styles.gameArea}>
        <Text style={styles.levelTitle}>{level.name}</Text>
        <Text style={styles.instruction}>Tap the button to collect coins!</Text>
        
        {/* Simplified gameplay - tap to collect coins */}
        <TouchableOpacity
          style={styles.collectButton}
          onPress={collectCoin}
          disabled={!gameActive || state.isPaused}
        >
          <Text style={styles.collectButtonText}>🪙 Collect Coin</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          This is a placeholder. Replace with actual game engine.
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.min((currentScore / level.targetScore) * 100, 100)}%` }
          ]}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)'
  },
  hudItem: {
    alignItems: 'center'
  },
  hudLabel: {
    fontSize: 12,
    color: '#ccc'
  },
  hudValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  pauseButton: {
    padding: 10
  },
  pauseText: {
    fontSize: 24
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  levelTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center'
  },
  instruction: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center'
  },
  collectButton: {
    backgroundColor: '#4ecca3',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 15,
    marginBottom: 20
  },
  collectButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  note: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 20
  },
  progressContainer: {
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    margin: 10,
    borderRadius: 5,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4ecca3'
  },
  errorText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginTop: 50
  }
});

export default GameScreen;
