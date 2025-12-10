/**
 * Runner Game Engine
 * Neon-themed auto-scrolling runner with obstacles and coins
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated
} from 'react-native';
import { GameEngineProps } from '../../GameEngine';
import { RUNNER_CONFIG } from '../../config/gameTypes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_SIZE = 50;
const OBSTACLE_WIDTH = 40;
const COIN_SIZE = 30;
const LANE_HEIGHT = 100;
const NUM_LANES = 3;

interface GameObject {
  id: string;
  x: number;
  y: number;
  type: 'obstacle' | 'coin';
  lane: number;
}

export const RunnerEngine: React.FC<GameEngineProps> = ({
  level,
  onScoreChange,
  onLivesChange,
  onWin,
  onLose,
  isPaused
}) => {
  const theme = RUNNER_CONFIG.theme;
  const [playerLane, setPlayerLane] = useState(1); // 0, 1, or 2
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [distance, setDistance] = useState(0);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const objectIdCounter = useRef(0);

  // Calculate target distance based on level
  const targetDistance = level.targetScore * 10;

  useEffect(() => {
    if (!isPaused) {
      startGameLoop();
    } else {
      stopGameLoop();
    }

    return () => stopGameLoop();
  }, [isPaused, playerLane]);

  const startGameLoop = () => {
    stopGameLoop();
    
    gameLoopRef.current = setInterval(() => {
      // Update distance
      setDistance(prev => {
        const newDistance = prev + 1;
        
        // Update score based on distance
        if (newDistance % 10 === 0) {
          const newScore = Math.floor(newDistance / 10);
          setScore(newScore);
          onScoreChange(newScore);
        }
        
        // Check win condition
        if (newDistance >= targetDistance) {
          stopGameLoop();
          onWin();
        }
        
        return newDistance;
      });

      // Spawn new objects
      if (Math.random() < level.obstacles * 0.0002) {
        spawnObstacle();
      }
      if (Math.random() < 0.015) {
        spawnCoin();
      }

      // Move objects and check collisions
      setObjects(prev => {
        const updated = prev.map(obj => ({
          ...obj,
          x: obj.x - 5 // Move left
        })).filter(obj => obj.x > -100); // Remove off-screen objects

        // Check collisions with player
        updated.forEach(obj => {
          if (obj.x < PLAYER_SIZE + 20 && obj.x > -20 && obj.lane === playerLane) {
            if (obj.type === 'obstacle') {
              handleObstacleCollision(obj.id);
            } else if (obj.type === 'coin') {
              handleCoinCollection(obj.id);
            }
          }
        });

        return updated.filter(obj => 
          !(obj.x < PLAYER_SIZE + 20 && obj.x > -20 && obj.lane === playerLane)
        );
      });
    }, 50);
  };

  const stopGameLoop = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  };

  const spawnObstacle = () => {
    const lane = Math.floor(Math.random() * NUM_LANES);
    const newObstacle: GameObject = {
      id: `obstacle-${objectIdCounter.current++}`,
      x: SCREEN_WIDTH,
      y: lane * LANE_HEIGHT,
      type: 'obstacle',
      lane
    };
    setObjects(prev => [...prev, newObstacle]);
  };

  const spawnCoin = () => {
    const lane = Math.floor(Math.random() * NUM_LANES);
    const newCoin: GameObject = {
      id: `coin-${objectIdCounter.current++}`,
      x: SCREEN_WIDTH,
      y: lane * LANE_HEIGHT,
      type: 'coin',
      lane
    };
    setObjects(prev => [...prev, newCoin]);
  };

  const handleObstacleCollision = (objectId: string) => {
    setLives(prev => {
      const newLives = Math.max(0, prev - 1);
      onLivesChange(newLives);
      
      if (newLives === 0) {
        stopGameLoop();
        onLose();
      }
      
      return newLives;
    });
  };

  const handleCoinCollection = (objectId: string) => {
    setScore(prev => {
      const newScore = prev + level.coinValue;
      onScoreChange(newScore);
      return newScore;
    });
  };

  const moveLane = (direction: 'up' | 'down') => {
    setPlayerLane(prev => {
      if (direction === 'up' && prev > 0) return prev - 1;
      if (direction === 'down' && prev < NUM_LANES - 1) return prev + 1;
      return prev;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Lanes */}
        {[0, 1, 2].map(lane => (
          <View
            key={lane}
            style={[
              styles.lane,
              { borderColor: theme.colors.primary + '40' }
            ]}
          />
        ))}

        {/* Player */}
        <View
          style={[
            styles.player,
            {
              top: playerLane * LANE_HEIGHT + (LANE_HEIGHT - PLAYER_SIZE) / 2,
              backgroundColor: theme.colors.accent,
              shadowColor: theme.colors.accent
            }
          ]}
        >
          <Text style={styles.playerIcon}>🏃</Text>
        </View>

        {/* Objects (obstacles and coins) */}
        {objects.map(obj => (
          <View
            key={obj.id}
            style={[
              obj.type === 'obstacle' ? styles.obstacle : styles.coin,
              {
                left: obj.x,
                top: obj.y + (LANE_HEIGHT - (obj.type === 'obstacle' ? OBSTACLE_WIDTH : COIN_SIZE)) / 2,
                backgroundColor: obj.type === 'obstacle' 
                  ? theme.colors.secondary 
                  : theme.colors.primary,
                shadowColor: obj.type === 'obstacle' 
                  ? theme.colors.secondary 
                  : theme.colors.primary
              }
            ]}
          >
            <Text style={styles.objectIcon}>
              {obj.type === 'obstacle' ? '⚠️' : '🪙'}
            </Text>
          </View>
        ))}

        {/* HUD Overlay */}
        <View style={styles.hudOverlay}>
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
              SCORE
            </Text>
            <Text style={[styles.hudValue, { color: theme.colors.primary }]}>
              {score}
            </Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
              DISTANCE
            </Text>
            <Text style={[styles.hudValue, { color: theme.colors.accent }]}>
              {Math.floor(distance / 10)}m
            </Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
              LIVES
            </Text>
            <Text style={[styles.hudValue, { color: theme.colors.secondary }]}>
              ❤️ {lives}
            </Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.primary + '40' }]}
          onPress={() => moveLane('up')}
          disabled={isPaused}
        >
          <Text style={[styles.controlText, { color: theme.colors.primary }]}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.secondary + '40' }]}
          onPress={() => moveLane('down')}
          disabled={isPaused}
        >
          <Text style={[styles.controlText, { color: theme.colors.secondary }]}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min((distance / targetDistance) * 100, 100)}%`,
              backgroundColor: theme.colors.accent
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  gameArea: {
    flex: 1,
    position: 'relative'
  },
  lane: {
    height: LANE_HEIGHT,
    borderBottomWidth: 2,
    opacity: 0.3
  },
  player: {
    position: 'absolute',
    left: 50,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10
  },
  playerIcon: {
    fontSize: 30
  },
  obstacle: {
    position: 'absolute',
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_WIDTH,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8
  },
  coin: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8
  },
  objectIcon: {
    fontSize: 20
  },
  hudOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10
  },
  hudItem: {
    alignItems: 'center'
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  hudValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  controlText: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  progressContainer: {
    height: 10,
    margin: 10,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  progressBar: {
    height: '100%'
  }
});
