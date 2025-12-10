/**
 * Generic Game Runtime
 * The heart of the dynamic game system
 * 
 * Provides:
 * - 60 FPS game loop
 * - Update/render cycle
 * - State management
 * - Lifecycle hooks
 * - Performance monitoring
 * 
 * Generated mechanics code plugs into this runtime.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { InputManager, createTouchHandlers } from './input';
import { RenderQueue, Camera } from './rendering';

/**
 * Game state
 */
export interface GameState {
  running: boolean;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
  time: number;
  gameOver: boolean;
  won: boolean;
  [key: string]: any; // Allow custom state
}

/**
 * Game runtime configuration
 */
export interface GameRuntimeConfig {
  targetFPS: number;
  enablePhysics: boolean;
  enableInput: boolean;
  enableCamera: boolean;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Game lifecycle hooks
 */
export interface GameLifecycle {
  onStart?: () => void;
  onUpdate?: (deltaTime: number, state: GameState) => void;
  onRender?: (renderQueue: RenderQueue, state: GameState) => void;
  onPause?: () => void;
  onResume?: () => void;
  onGameOver?: (won: boolean) => void;
  onInput?: (inputManager: InputManager) => void;
}

/**
 * Props for GameRuntime component
 */
export interface GameRuntimeProps {
  config: GameRuntimeConfig;
  lifecycle: GameLifecycle;
  initialState?: Partial<GameState>;
  children?: React.ReactNode;
}

const DEFAULT_CONFIG: GameRuntimeConfig = {
  targetFPS: 60,
  enablePhysics: true,
  enableInput: true,
  enableCamera: false,
  screenWidth: Dimensions.get('window').width,
  screenHeight: Dimensions.get('window').height
};

const DEFAULT_STATE: GameState = {
  running: true,
  paused: false,
  score: 0,
  lives: 3,
  level: 1,
  time: 0,
  gameOver: false,
  won: false
};

/**
 * GameRuntime Component
 * 
 * This is the generic game loop that ALL generated games use.
 * Generated mechanics code provides the lifecycle hooks.
 */
export const GameRuntime: React.FC<GameRuntimeProps> = ({
  config = DEFAULT_CONFIG,
  lifecycle,
  initialState = {},
  children
}) => {
  // State
  const [gameState, setGameState] = useState<GameState>({
    ...DEFAULT_STATE,
    ...initialState
  });

  // Refs for game loop
  const frameIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0, fps: 60 });
  const inputManagerRef = useRef<InputManager>(new InputManager());
  const renderQueueRef = useRef<RenderQueue>(new RenderQueue());
  const cameraRef = useRef<Camera | null>(
    config.enableCamera 
      ? new Camera(config.screenWidth, config.screenHeight)
      : null
  );

  /**
   * Initialize game
   */
  useEffect(() => {
    console.log('[GameRuntime] Initializing...');
    
    if (lifecycle.onStart) {
      lifecycle.onStart();
    }

    return () => {
      console.log('[GameRuntime] Cleaning up...');
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, []);

  /**
   * Main game loop
   */
  const gameLoop = useCallback((currentTime: number) => {
    // Calculate delta time
    const deltaTime = lastFrameTimeRef.current === 0 
      ? 0 
      : (currentTime - lastFrameTimeRef.current) / 1000; // Convert to seconds
    
    lastFrameTimeRef.current = currentTime;

    // Cap delta time to prevent spiral of death
    const cappedDeltaTime = Math.min(deltaTime, 1 / 30); // Max 30 FPS minimum

    // Update FPS counter
    updateFPS(currentTime);

    // Skip if paused
    if (gameState.paused || gameState.gameOver) {
      frameIdRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Update phase
    if (lifecycle.onUpdate) {
      lifecycle.onUpdate(cappedDeltaTime, gameState);
    }

    // Update game time
    setGameState(prev => ({
      ...prev,
      time: prev.time + cappedDeltaTime
    }));

    // Render phase
    renderQueueRef.current.clear();
    if (lifecycle.onRender) {
      lifecycle.onRender(renderQueueRef.current, gameState);
    }

    // Check game over
    if (gameState.gameOver || gameState.won) {
      if (lifecycle.onGameOver) {
        lifecycle.onGameOver(gameState.won);
      }
    }

    // Schedule next frame
    frameIdRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, lifecycle]);

  /**
   * Update FPS counter
   */
  const updateFPS = (currentTime: number) => {
    fpsCounterRef.current.frames++;
    
    if (currentTime - fpsCounterRef.current.lastTime >= 1000) {
      fpsCounterRef.current.fps = fpsCounterRef.current.frames;
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = currentTime;
    }
  };

  /**
   * Start/resume game loop
   */
  useEffect(() => {
    if (gameState.running && !gameState.paused) {
      frameIdRef.current = requestAnimationFrame(gameLoop);
      
      return () => {
        if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
        }
      };
    }
  }, [gameState.running, gameState.paused, gameLoop]);

  /**
   * Handle input events
   */
  useEffect(() => {
    if (config.enableInput && lifecycle.onInput) {
      lifecycle.onInput(inputManagerRef.current);
    }
  }, [config.enableInput, lifecycle]);

  /**
   * Pause/resume handlers
   */
  const handlePause = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: true }));
    if (lifecycle.onPause) {
      lifecycle.onPause();
    }
  }, [lifecycle]);

  const handleResume = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: false }));
    if (lifecycle.onResume) {
      lifecycle.onResume();
    }
  }, [lifecycle]);

  /**
   * Touch handlers
   */
  const touchHandlers = config.enableInput 
    ? createTouchHandlers(inputManagerRef.current)
    : {};

  return (
    <View 
      style={[
        styles.container,
        { 
          width: config.screenWidth, 
          height: config.screenHeight 
        }
      ]}
      {...touchHandlers}
    >
      {/* Game canvas - children render here */}
      <View style={styles.canvas}>
        {children}
      </View>

      {/* Debug info (only in dev) */}
      {__DEV__ && (
        <View style={styles.debug}>
          <View style={styles.debugText}>
            {/* FPS: {fpsCounterRef.current.fps} */}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000000'
  },
  canvas: {
    flex: 1,
    position: 'relative'
  },
  debug: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4
  },
  debugText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace'
  }
});

/**
 * Hook to access game state from lifecycle callbacks
 */
export function useGameState(initialState?: Partial<GameState>) {
  const [state, setState] = useState<GameState>({
    ...DEFAULT_STATE,
    ...initialState
  });

  const updateState = useCallback((updates: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    setState({ ...DEFAULT_STATE, ...initialState });
  }, [initialState]);

  return {
    state,
    setState: updateState,
    resetState
  };
}

/**
 * Hook to create game lifecycle from functions
 */
export function useGameLifecycle(
  onUpdate: (deltaTime: number, state: GameState) => void,
  onRender: (renderQueue: RenderQueue, state: GameState) => void,
  options?: {
    onStart?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onGameOver?: (won: boolean) => void;
    onInput?: (inputManager: InputManager) => void;
  }
): GameLifecycle {
  return {
    onUpdate,
    onRender,
    ...options
  };
}

/**
 * Performance monitor utility
 */
export class PerformanceMonitor {
  private samples: number[] = [];
  private maxSamples: number = 60;

  addSample(deltaTime: number): void {
    this.samples.push(deltaTime);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getAverageFPS(): number {
    if (this.samples.length === 0) return 0;
    const avgDelta = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    return 1 / avgDelta;
  }

  getMinFPS(): number {
    if (this.samples.length === 0) return 0;
    const maxDelta = Math.max(...this.samples);
    return 1 / maxDelta;
  }

  getMaxFPS(): number {
    if (this.samples.length === 0) return 0;
    const minDelta = Math.min(...this.samples);
    return 1 / minDelta;
  }

  clear(): void {
    this.samples = [];
  }
}

export default GameRuntime;
