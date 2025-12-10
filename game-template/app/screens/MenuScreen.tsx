/**
 * Menu Screen
 * Main menu with level selection and shop access
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export interface MenuScreenProps {
  onStartGame: (level: number) => void;
  onOpenShop: () => void;
}

interface GameProgress {
  highScore: number;
  coins: number;
  lives: number;
  unlockedLevels: number;
  completedLevels: boolean[];
}

export default function MenuScreen({ onStartGame, onOpenShop }: MenuScreenProps) {
  const [gameProgress, setGameProgress] = useState<GameProgress>({
    highScore: 0,
    coins: 0,
    lives: 5,
    unlockedLevels: 1,
    completedLevels: [false, false, false]
  });

  // Load saved game progress on component mount
  useEffect(() => {
    loadGameProgress();
  }, []);

  const loadGameProgress = async (): Promise<void> => {
    try {
      const savedProgress = await AsyncStorage.getItem('gameProgress');
      if (savedProgress) {
        const progress: GameProgress = JSON.parse(savedProgress);
        setGameProgress(progress);
      }
    } catch (error) {
      console.error('Failed to load game progress:', error);
    }
  };

  const handleLevelSelect = (level: number): void => {
    if (level <= gameProgress.unlockedLevels) {
      if (gameProgress.lives <= 0) {
        Alert.alert('No Lives Left', 'You need to buy more lives from the shop or wait for them to regenerate.');
        return;
      }
      onStartGame(level);
    } else {
      Alert.alert('Level Locked', `Complete level ${level - 1} to unlock this level.`);
    }
  };

  const renderLevelButton = (level: number): JSX.Element => {
    const isUnlocked = level <= gameProgress.unlockedLevels;
    const isCompleted = gameProgress.completedLevels[level - 1];
    
    return (
      <TouchableOpacity
        key={level}
        style={[
          styles.levelButton,
          !isUnlocked && styles.levelButtonLocked,
          isCompleted && styles.levelButtonCompleted
        ]}
        onPress={() => handleLevelSelect(level)}
        disabled={!isUnlocked}
      >
        <Text style={[
          styles.levelButtonText,
          !isUnlocked && styles.levelButtonTextLocked
        ]}>
          Level {level}
        </Text>
        {isCompleted && (
          <Text style={styles.completedText}>★</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <View style={styles.backgroundDecor}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>GAME</Text>
        <Text style={styles.subtitle}>Template Game</Text>

        {/* Game Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>High Score</Text>
            <Text style={styles.statValue}>{gameProgress.highScore}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Coins</Text>
            <Text style={styles.statValue}>{gameProgress.coins}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lives</Text>
            <Text style={styles.statValue}>{gameProgress.lives}</Text>
          </View>
        </View>

        {/* Level Selection */}
        <View style={styles.levelsContainer}>
          <Text style={styles.levelsTitle}>Select Level</Text>
          <View style={styles.levelButtons}>
            {[1, 2, 3].map(level => renderLevelButton(level))}
          </View>
        </View>

        {/* Shop Button */}
        <TouchableOpacity style={styles.shopButton} onPress={onOpenShop}>
          <Text style={styles.shopButtonText}>Shop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  backgroundDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: '#e94560',
    top: -50,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: '#0f3460',
    bottom: 100,
    left: -50,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 40,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaaaaa',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e94560',
  },
  levelsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  levelsTitle: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 20,
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  levelButton: {
    backgroundColor: '#16213e',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e94560',
    minWidth: 80,
    alignItems: 'center',
  },
  levelButtonLocked: {
    backgroundColor: '#333333',
    borderColor: '#666666',
  },
  levelButtonCompleted: {
    backgroundColor: '#2a4a2a',
    borderColor: '#00ff00',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  levelButtonTextLocked: {
    color: '#666666',
  },
  completedText: {
    fontSize: 16,
    color: '#00ff00',
    marginTop: 2,
  },
  shopButton: {
    backgroundColor: '#e94560',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ff6b8a',
  },
  shopButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
