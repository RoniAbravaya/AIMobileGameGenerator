/**
 * Platformer Game Engine
 * Classic 2D platformer with jumping mechanics
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { GameEngineProps } from '../../GameEngine';
import { PLATFORMER_CONFIG } from '../../config/gameTypes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_SIZE = 40;
const PLATFORM_HEIGHT = 20;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;

interface Platform {
  x: number;
  y: number;
  width: number;
}

export const PlatformerEngine: React.FC<GameEngineProps> = ({
  level,
  onScoreChange,
  onLivesChange,
  onWin,
  onLose,
  isPaused
}) => {
  const theme = PLATFORMER_CONFIG.theme;
  const [playerX, setPlayerX] = useState(50);
  const [playerY, setPlayerY] = useState(300);
  const [velocityY, setVelocityY] = useState(0);
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [platforms] = useState<Platform[]>([
    { x: 0, y: SCREEN_HEIGHT - 100, width: SCREEN_WIDTH }, // Ground
    { x: 100, y: SCREEN_HEIGHT - 200, width: 150 },
    { x: 300, y: SCREEN_HEIGHT - 300, width: 150 },
    { x: 150, y: SCREEN_HEIGHT - 400, width: 200 },
    { x: 400, y: SCREEN_HEIGHT - 450, width: 100 }
  ]);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPaused) {
      startGameLoop();
    } else {
      stopGameLoop();
    }
    return () => stopGameLoop();
  }, [isPaused, playerX, playerY, velocityY]);

  useEffect(() => {
    // Check if reached top platform (win condition)
    if (playerY < SCREEN_HEIGHT - 450 && playerX >= 400 && playerX <= 500) {
      onWin();
    }
  }, [playerY, playerX]);

  const startGameLoop = () => {
    stopGameLoop();
    
    gameLoopRef.current = setInterval(() => {
      setVelocityY(prevVel => {
        const newVel = prevVel + GRAVITY;
        
        setPlayerY(prevY => {
          let newY = prevY + newVel;
          
          // Check platform collisions
          let onPlatform = false;
          platforms.forEach(platform => {
            if (
              playerX + PLAYER_SIZE > platform.x &&
              playerX < platform.x + platform.width &&
              prevY + PLAYER_SIZE <= platform.y &&
              newY + PLAYER_SIZE >= platform.y
            ) {
              newY = platform.y - PLAYER_SIZE;
              onPlatform = true;
              setIsJumping(false);
            }
          });
          
          // Fall off screen = lose
          if (newY > SCREEN_HEIGHT) {
            stopGameLoop();
            onLose();
          }
          
          return newY;
        });
        
        return newVel;
      });
    }, 16); // ~60fps
  };

  const stopGameLoop = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  };

  const jump = () => {
    if (!isJumping && !isPaused) {
      setVelocityY(JUMP_FORCE);
      setIsJumping(true);
    }
  };

  const moveLeft = () => {
    if (!isPaused) {
      setPlayerX(prev => Math.max(0, prev - 10));
    }
  };

  const moveRight = () => {
    if (!isPaused) {
      setPlayerX(prev => Math.min(SCREEN_WIDTH - PLAYER_SIZE, prev + 10));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Platforms */}
        {platforms.map((platform, index) => (
          <View
            key={index}
            style={[
              styles.platform,
              {
                left: platform.x,
                top: platform.y,
                width: platform.width,
                backgroundColor: index === 0 ? theme.colors.secondary : theme.colors.primary
              }
            ]}
          />
        ))}

        {/* Goal Platform Indicator */}
        <View style={[styles.goal, { left: 425, top: SCREEN_HEIGHT - 470 }]}>
          <Text style={styles.goalText}>🏁</Text>
        </View>

        {/* Player */}
        <View
          style={[
            styles.player,
            {
              left: playerX,
              top: playerY,
              backgroundColor: theme.colors.accent
            }
          ]}
        >
          <Text style={styles.playerIcon}>🏃</Text>
        </View>

        {/* Instructions Overlay */}
        <View style={styles.instructions}>
          <Text style={[styles.instructionText, { color: theme.colors.text }]}>
            Reach the flag at the top!
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.dpad}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: theme.colors.primary + '80' }]}
            onPress={moveLeft}
          >
            <Text style={styles.controlText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: theme.colors.primary + '80' }]}
            onPress={moveRight}
          >
            <Text style={styles.controlText}>→</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.jumpButton, { backgroundColor: theme.colors.accent + '80' }]}
          onPress={jump}
        >
          <Text style={styles.jumpText}>JUMP</Text>
        </TouchableOpacity>
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
  platform: {
    position: 'absolute',
    height: PLATFORM_HEIGHT,
    borderRadius: 5
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  playerIcon: {
    fontSize: 24
  },
  goal: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  goalText: {
    fontSize: 30
  },
  instructions: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  instructionText: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  dpad: {
    flexDirection: 'row',
    gap: 10
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  controlText: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold'
  },
  jumpButton: {
    width: 100,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  jumpText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold'
  }
});
