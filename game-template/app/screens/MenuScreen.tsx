/**
 * Main Menu Screen
 * Entry point of the game with level selection and shop
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { LEVELS } from '../config/levels';
import { useGameState } from '../hooks/useGameState';

interface MenuScreenProps {
  onStartLevel: (levelId: number) => void;
  onOpenShop: () => void;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ onStartLevel, onOpenShop }) => {
  const { state } = useGameState();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Game Title</Text>
          <Text style={styles.subtitle}>Select a Level</Text>
        </View>

        {/* Player Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lives</Text>
            <Text style={styles.statValue}>❤️ {state.lives}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Coins</Text>
            <Text style={styles.statValue}>🪙 {state.coins}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>High Score</Text>
            <Text style={styles.statValue}>⭐ {state.highScore}</Text>
          </View>
        </View>

        {/* Level Selection */}
        <View style={styles.levelsContainer}>
          {LEVELS.map((level) => {
            const isCompleted = state.completedLevels.includes(level.id);
            const isUnlocked = level.id === 1 || state.completedLevels.includes(level.id - 1);
            const canPlay = level.isPlayable && isUnlocked;
            const isLocked = !level.isPlayable || !isUnlocked;

            return (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelButton,
                  isLocked && styles.levelButtonLocked,
                  level.comingSoon && styles.levelButtonComingSoon
                ]}
                onPress={() => {
                  if (level.comingSoon) {
                    Alert.alert(
                      '🎮 Coming Soon!',
                      `${level.name} will be unlocked in a future update. Stay tuned!`,
                      [{ text: 'OK' }]
                    );
                  } else if (canPlay) {
                    onStartLevel(level.id);
                  }
                }}
                disabled={!canPlay && !level.comingSoon}
              >
                <View style={styles.levelInfo}>
                  <Text style={[
                    styles.levelNumber,
                    isLocked && styles.levelTextLocked
                  ]}>
                    Level {level.id}
                  </Text>
                  <Text style={[
                    styles.levelName,
                    isLocked && styles.levelTextLocked
                  ]}>
                    {level.name}
                  </Text>
                  <Text style={[
                    styles.levelDifficulty,
                    isLocked && styles.levelTextLocked
                  ]}>
                    {level.difficulty.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.levelBadges}>
                  {isCompleted && <Text style={styles.completedBadge}>✓</Text>}
                  {level.comingSoon && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>SOON</Text>
                    </View>
                  )}
                  {isLocked && !level.comingSoon && <Text style={styles.lockedBadge}>🔒</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Shop Button */}
        <TouchableOpacity style={styles.shopButton} onPress={onOpenShop}>
          <Text style={styles.shopButtonText}>🛒 Shop</Text>
        </TouchableOpacity>

        {/* Ad Banner Placeholder - Enable in production builds */}
        <View style={styles.adContainer}>
          <View style={styles.adPlaceholder}>
            <Text style={styles.adPlaceholderText}>Ad Space</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  },
  scrollContent: {
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 20,
    color: '#ccc'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  levelsContainer: {
    marginBottom: 20
  },
  levelButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10
  },
  levelButtonLocked: {
    opacity: 0.5
  },
  levelButtonComingSoon: {
    borderWidth: 2,
    borderColor: '#e94560',
    backgroundColor: '#0a2540'
  },
  levelInfo: {
    flex: 1
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  levelName: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 5
  },
  levelDifficulty: {
    fontSize: 12,
    color: '#e94560'
  },
  levelTextLocked: {
    color: '#666'
  },
  levelBadges: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5
  },
  completedBadge: {
    fontSize: 30,
    color: '#4ecca3'
  },
  lockedBadge: {
    fontSize: 30
  },
  comingSoonBadge: {
    backgroundColor: '#e94560',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff'
  },
  shopButton: {
    backgroundColor: '#e94560',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20
  },
  shopButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  adContainer: {
    alignItems: 'center',
    marginTop: 20
  },
  adPlaceholder: {
    width: 320,
    height: 50,
    backgroundColor: '#16213e',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderStyle: 'dashed'
  },
  adPlaceholderText: {
    color: '#666',
    fontSize: 12
  }
});

export default MenuScreen;
