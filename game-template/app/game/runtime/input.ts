/**
 * Input System
 * Handles touch input for mobile games
 * 
 * Supports:
 * - Tap detection
 * - Double tap
 * - Long press
 * - Drag/swipe gestures
 * - Virtual buttons
 */

import { Vector2D } from './physics2d';

/**
 * Input event types
 */
export type InputEventType = 
  | 'tap'
  | 'double_tap'
  | 'long_press'
  | 'swipe_up'
  | 'swipe_down'
  | 'swipe_left'
  | 'swipe_right'
  | 'drag_start'
  | 'drag_move'
  | 'drag_end';

/**
 * Input event
 */
export interface InputEvent {
  type: InputEventType;
  position: Vector2D;
  timestamp: number;
  deltaX?: number;
  deltaY?: number;
  duration?: number;
}

/**
 * Input configuration
 */
export interface InputConfig {
  doubleTapThreshold: number;    // Max ms between taps for double tap
  longPressThreshold: number;    // Min ms for long press
  swipeThreshold: number;        // Min distance for swipe
  swipeVelocityThreshold: number; // Min velocity for swipe
  dragThreshold: number;         // Min distance to start drag
}

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  doubleTapThreshold: 300,
  longPressThreshold: 500,
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
  dragThreshold: 10
};

/**
 * Touch state tracker
 */
interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  lastTapTime: number;
  isDragging: boolean;
  longPressTriggered: boolean;
  longPressTimer: NodeJS.Timeout | null;
}

/**
 * Input event callback
 */
export type InputEventCallback = (event: InputEvent) => void;

/**
 * Input Manager
 * Handles all touch input and gesture detection
 */
export class InputManager {
  private config: InputConfig;
  private touchState: TouchState | null = null;
  private listeners: Map<InputEventType, Set<InputEventCallback>>;

  constructor(config: InputConfig = DEFAULT_INPUT_CONFIG) {
    this.config = config;
    this.listeners = new Map();
    this.touchState = null;
  }

  /**
   * Register event listener
   */
  on(eventType: InputEventType, callback: InputEventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  /**
   * Unregister event listener
   */
  off(eventType: InputEventType, callback: InputEventCallback): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: InputEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  /**
   * Handle touch start
   */
  handleTouchStart(x: number, y: number): void {
    const now = Date.now();

    // Clear any existing long press timer
    if (this.touchState?.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
    }

    // Initialize touch state
    this.touchState = {
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      startTime: now,
      lastTapTime: this.touchState?.lastTapTime || 0,
      isDragging: false,
      longPressTriggered: false,
      longPressTimer: null
    };

    // Start long press timer
    this.touchState.longPressTimer = setTimeout(() => {
      if (this.touchState && !this.touchState.isDragging) {
        this.touchState.longPressTriggered = true;
        this.emit({
          type: 'long_press',
          position: new Vector2D(x, y),
          timestamp: Date.now(),
          duration: Date.now() - this.touchState.startTime
        });
      }
    }, this.config.longPressThreshold);
  }

  /**
   * Handle touch move
   */
  handleTouchMove(x: number, y: number): void {
    if (!this.touchState) return;

    const deltaX = x - this.touchState.currentX;
    const deltaY = y - this.touchState.currentY;
    const totalDeltaX = x - this.touchState.startX;
    const totalDeltaY = y - this.touchState.startY;
    const distance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);

    // Update current position
    this.touchState.currentX = x;
    this.touchState.currentY = y;

    // Check if drag started
    if (!this.touchState.isDragging && distance > this.config.dragThreshold) {
      this.touchState.isDragging = true;
      
      // Cancel long press
      if (this.touchState.longPressTimer) {
        clearTimeout(this.touchState.longPressTimer);
        this.touchState.longPressTimer = null;
      }

      this.emit({
        type: 'drag_start',
        position: new Vector2D(x, y),
        timestamp: Date.now(),
        deltaX: totalDeltaX,
        deltaY: totalDeltaY
      });
    }

    // Emit drag move if dragging
    if (this.touchState.isDragging) {
      this.emit({
        type: 'drag_move',
        position: new Vector2D(x, y),
        timestamp: Date.now(),
        deltaX,
        deltaY
      });
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(x: number, y: number): void {
    if (!this.touchState) return;

    const now = Date.now();
    const duration = now - this.touchState.startTime;
    const deltaX = x - this.touchState.startX;
    const deltaY = y - this.touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Clear long press timer
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressTimer = null;
    }

    // Check for drag end
    if (this.touchState.isDragging) {
      this.emit({
        type: 'drag_end',
        position: new Vector2D(x, y),
        timestamp: now,
        deltaX,
        deltaY
      });
    }
    // Check for swipe
    else if (distance > this.config.swipeThreshold && duration < 500) {
      const velocity = distance / duration;
      
      if (velocity > this.config.swipeVelocityThreshold) {
        const swipeType = this.detectSwipeDirection(deltaX, deltaY);
        this.emit({
          type: swipeType,
          position: new Vector2D(x, y),
          timestamp: now,
          deltaX,
          deltaY
        });
      }
    }
    // Check for tap or double tap
    else if (!this.touchState.longPressTriggered && distance < this.config.dragThreshold) {
      const timeSinceLastTap = now - this.touchState.lastTapTime;
      
      if (timeSinceLastTap < this.config.doubleTapThreshold) {
        // Double tap
        this.emit({
          type: 'double_tap',
          position: new Vector2D(x, y),
          timestamp: now
        });
        // Reset last tap time to prevent triple tap
        this.touchState.lastTapTime = 0;
      } else {
        // Single tap
        this.emit({
          type: 'tap',
          position: new Vector2D(x, y),
          timestamp: now
        });
        this.touchState.lastTapTime = now;
      }
    }

    // Reset touch state
    this.touchState = null;
  }

  /**
   * Detect swipe direction
   */
  private detectSwipeDirection(deltaX: number, deltaY: number): InputEventType {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY) {
      return deltaX > 0 ? 'swipe_right' : 'swipe_left';
    } else {
      return deltaY > 0 ? 'swipe_down' : 'swipe_up';
    }
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
    if (this.touchState?.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
    }
    this.touchState = null;
  }
}

/**
 * Virtual Button
 * For games with button-based controls
 */
export interface VirtualButton {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  isPressed: boolean;
}

/**
 * Virtual Button Manager
 */
export class VirtualButtonManager {
  private buttons: Map<string, VirtualButton>;
  private pressedButtons: Set<string>;
  private callbacks: Map<string, Set<() => void>>;

  constructor() {
    this.buttons = new Map();
    this.pressedButtons = new Set();
    this.callbacks = new Map();
  }

  /**
   * Add a button
   */
  addButton(button: VirtualButton): void {
    this.buttons.set(button.id, button);
  }

  /**
   * Remove a button
   */
  removeButton(id: string): void {
    this.buttons.delete(id);
    this.pressedButtons.delete(id);
    this.callbacks.delete(id);
  }

  /**
   * Register button press callback
   */
  onButtonPress(buttonId: string, callback: () => void): void {
    if (!this.callbacks.has(buttonId)) {
      this.callbacks.set(buttonId, new Set());
    }
    this.callbacks.get(buttonId)!.add(callback);
  }

  /**
   * Check if touch position hits any button
   */
  handleTouch(x: number, y: number, pressed: boolean): void {
    for (const [id, button] of this.buttons.entries()) {
      const hit = this.isPointInButton(x, y, button);
      
      if (hit && pressed && !this.pressedButtons.has(id)) {
        // Button just pressed
        this.pressedButtons.add(id);
        button.isPressed = true;
        
        // Emit callback
        const callbacks = this.callbacks.get(id);
        if (callbacks) {
          callbacks.forEach(cb => cb());
        }
      } else if (!pressed && this.pressedButtons.has(id)) {
        // Button released
        this.pressedButtons.delete(id);
        button.isPressed = false;
      }
    }
  }

  /**
   * Check if point is in button bounds
   */
  private isPointInButton(x: number, y: number, button: VirtualButton): boolean {
    return (
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height
    );
  }

  /**
   * Get button state
   */
  isButtonPressed(id: string): boolean {
    return this.pressedButtons.has(id);
  }

  /**
   * Get all buttons
   */
  getButtons(): VirtualButton[] {
    return Array.from(this.buttons.values());
  }

  /**
   * Clear all buttons
   */
  clear(): void {
    this.buttons.clear();
    this.pressedButtons.clear();
    this.callbacks.clear();
  }
}

/**
 * Helper function to create touch event handlers for React Native
 */
export function createTouchHandlers(inputManager: InputManager) {
  return {
    onTouchStart: (event: any) => {
      const touch = event.nativeEvent.touches[0];
      if (touch) {
        inputManager.handleTouchStart(touch.pageX, touch.pageY);
      }
    },
    onTouchMove: (event: any) => {
      const touch = event.nativeEvent.touches[0];
      if (touch) {
        inputManager.handleTouchMove(touch.pageX, touch.pageY);
      }
    },
    onTouchEnd: (event: any) => {
      const touch = event.nativeEvent.changedTouches[0];
      if (touch) {
        inputManager.handleTouchEnd(touch.pageX, touch.pageY);
      }
    }
  };
}
