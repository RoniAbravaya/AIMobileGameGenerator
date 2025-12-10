/**
 * 2D Rendering Helpers
 * Simple utilities for rendering 2D games in React Native
 * 
 * Provides:
 * - Shape primitives (rect, circle, line)
 * - Text rendering helpers
 * - Layer system
 * - Sprite rendering
 * - Canvas-like API for custom drawing
 */

import { View, Text, StyleSheet } from 'react-native';
import { Vector2D, AABB, Circle } from './physics2d';

/**
 * Render layer
 */
export enum RenderLayer {
  BACKGROUND = 0,
  GAME = 1,
  FOREGROUND = 2,
  UI = 3
}

/**
 * Sprite definition
 */
export interface Sprite {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;  // In radians
  opacity?: number;   // 0-1
  layer?: RenderLayer;
  zIndex?: number;
}

/**
 * Shape types
 */
export type ShapeType = 'rect' | 'circle' | 'line';

/**
 * Shape definition
 */
export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  opacity?: number;
  rotation?: number;
  layer?: RenderLayer;
  zIndex?: number;
}

/**
 * Text element
 */
export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  opacity?: number;
  layer?: RenderLayer;
  zIndex?: number;
}

/**
 * Renderable item (union type)
 */
export type RenderableItem = Sprite | Shape | TextElement;

/**
 * Render queue - manages all items to be rendered
 */
export class RenderQueue {
  private items: Map<string, RenderableItem>;

  constructor() {
    this.items = new Map();
  }

  /**
   * Add item to render queue
   */
  add(item: RenderableItem): void {
    this.items.set(item.id, item);
  }

  /**
   * Remove item from queue
   */
  remove(id: string): void {
    this.items.delete(id);
  }

  /**
   * Update existing item
   */
  update(id: string, updates: Partial<RenderableItem>): void {
    const item = this.items.get(id);
    if (item) {
      Object.assign(item, updates);
    }
  }

  /**
   * Get all items sorted by layer and zIndex
   */
  getSorted(): RenderableItem[] {
    return Array.from(this.items.values()).sort((a, b) => {
      const layerA = (a as any).layer ?? RenderLayer.GAME;
      const layerB = (b as any).layer ?? RenderLayer.GAME;
      
      if (layerA !== layerB) {
        return layerA - layerB;
      }
      
      const zIndexA = (a as any).zIndex ?? 0;
      const zIndexB = (b as any).zIndex ?? 0;
      return zIndexA - zIndexB;
    });
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Get item count
   */
  count(): number {
    return this.items.size;
  }
}

/**
 * Helper to create rectangle shape
 */
export function createRect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  options?: Partial<Shape>
): Shape {
  return {
    id,
    type: 'rect',
    x,
    y,
    width,
    height,
    color,
    ...options
  };
}

/**
 * Helper to create circle shape
 */
export function createCircle(
  id: string,
  x: number,
  y: number,
  radius: number,
  color: string,
  options?: Partial<Shape>
): Shape {
  return {
    id,
    type: 'circle',
    x,
    y,
    radius,
    color,
    ...options
  };
}

/**
 * Helper to create line shape
 */
export function createLine(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  options?: Partial<Shape>
): Shape {
  return {
    id,
    type: 'line',
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    color,
    ...options
  };
}

/**
 * Helper to create text element
 */
export function createText(
  id: string,
  text: string,
  x: number,
  y: number,
  options?: Partial<TextElement>
): TextElement {
  return {
    id,
    text,
    x,
    y,
    fontSize: 16,
    color: '#FFFFFF',
    align: 'left',
    ...options
  };
}

/**
 * Helper to create sprite from AABB
 */
export function spriteFromAABB(
  id: string,
  box: AABB,
  color: string,
  options?: Partial<Sprite>
): Shape {
  return createRect(id, box.x, box.y, box.width, box.height, color, options);
}

/**
 * Helper to create sprite from Circle
 */
export function spriteFromCircle(
  id: string,
  circle: Circle,
  color: string,
  options?: Partial<Sprite>
): Shape {
  return createCircle(id, circle.x, circle.y, circle.radius, color, options);
}

/**
 * Color utilities
 */
export const Colors = {
  /**
   * Convert RGB to hex
   */
  rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  },

  /**
   * Convert hex to RGB
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  /**
   * Add opacity to color
   */
  withOpacity(color: string, opacity: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  },

  /**
   * Lighten color
   */
  lighten(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    return this.rgbToHex(
      Math.min(255, rgb.r + amount),
      Math.min(255, rgb.g + amount),
      Math.min(255, rgb.b + amount)
    );
  },

  /**
   * Darken color
   */
  darken(color: string, amount: number): string {
    return this.lighten(color, -amount);
  }
};

/**
 * Animation easing functions
 */
export const Easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  bounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
};

/**
 * Simple animation controller
 */
export class Animation {
  private startValue: number;
  private endValue: number;
  private duration: number;
  private startTime: number;
  private easingFunction: (t: number) => number;
  private onUpdate: (value: number) => void;
  private onComplete?: () => void;
  private isRunning: boolean = false;

  constructor(
    startValue: number,
    endValue: number,
    duration: number,
    onUpdate: (value: number) => void,
    easing: (t: number) => number = Easing.linear,
    onComplete?: () => void
  ) {
    this.startValue = startValue;
    this.endValue = endValue;
    this.duration = duration;
    this.easingFunction = easing;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.startTime = 0;
  }

  /**
   * Start animation
   */
  start(): void {
    this.startTime = Date.now();
    this.isRunning = true;
  }

  /**
   * Update animation (call every frame)
   */
  update(): boolean {
    if (!this.isRunning) return false;

    const elapsed = Date.now() - this.startTime;
    const t = Math.min(1, elapsed / this.duration);
    const easedT = this.easingFunction(t);
    const currentValue = this.startValue + (this.endValue - this.startValue) * easedT;

    this.onUpdate(currentValue);

    if (t >= 1) {
      this.isRunning = false;
      if (this.onComplete) {
        this.onComplete();
      }
      return false;
    }

    return true;
  }

  /**
   * Stop animation
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Check if running
   */
  running(): boolean {
    return this.isRunning;
  }
}

/**
 * Particle system for simple effects
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 100) {
    this.maxParticles = maxParticles;
  }

  /**
   * Emit particles
   */
  emit(x: number, y: number, count: number, options?: {
    velocityRange?: [number, number];
    lifeRange?: [number, number];
    sizeRange?: [number, number];
    color?: string;
  }): void {
    const defaults = {
      velocityRange: [-100, 100] as [number, number],
      lifeRange: [500, 1500] as [number, number],
      sizeRange: [2, 6] as [number, number],
      color: '#FFFFFF'
    };
    
    const opts = { ...defaults, ...options };

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const vx = Math.random() * (opts.velocityRange[1] - opts.velocityRange[0]) + opts.velocityRange[0];
      const vy = Math.random() * (opts.velocityRange[1] - opts.velocityRange[0]) + opts.velocityRange[0];
      const life = Math.random() * (opts.lifeRange[1] - opts.lifeRange[0]) + opts.lifeRange[0];
      const size = Math.random() * (opts.sizeRange[1] - opts.sizeRange[0]) + opts.sizeRange[0];

      this.particles.push({
        x,
        y,
        vx,
        vy,
        life,
        maxLife: life,
        size,
        color: opts.color
      });
    }
  }

  /**
   * Update particles
   */
  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      
      // Update life
      p.life -= deltaTime * 1000;
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Get particles as shapes for rendering
   */
  getShapes(): Shape[] {
    return this.particles.map((p, index) => {
      const opacity = p.life / p.maxLife;
      return createCircle(
        `particle-${index}`,
        p.x,
        p.y,
        p.size,
        p.color,
        { opacity, layer: RenderLayer.FOREGROUND }
      );
    });
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }

  /**
   * Get particle count
   */
  count(): number {
    return this.particles.length;
  }
}

/**
 * Camera system for scrolling games
 */
export class Camera {
  public x: number = 0;
  public y: number = 0;
  public width: number;
  public height: number;
  public zoom: number = 1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Follow target (smooth camera)
   */
  follow(targetX: number, targetY: number, smoothing: number = 0.1): void {
    const targetCameraX = targetX - this.width / 2;
    const targetCameraY = targetY - this.height / 2;
    
    this.x += (targetCameraX - this.x) * smoothing;
    this.y += (targetCameraY - this.y) * smoothing;
  }

  /**
   * Clamp camera to bounds
   */
  clampToBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.x = Math.max(minX, Math.min(this.x, maxX - this.width));
    this.y = Math.max(minY, Math.min(this.y, maxY - this.height));
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): Vector2D {
    return new Vector2D(
      (worldX - this.x) * this.zoom,
      (worldY - this.y) * this.zoom
    );
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): Vector2D {
    return new Vector2D(
      screenX / this.zoom + this.x,
      screenY / this.zoom + this.y
    );
  }

  /**
   * Check if point is visible
   */
  isVisible(x: number, y: number, margin: number = 0): boolean {
    return (
      x >= this.x - margin &&
      x <= this.x + this.width + margin &&
      y >= this.y - margin &&
      y <= this.y + this.height + margin
    );
  }

  /**
   * Check if AABB is visible
   */
  isAABBVisible(box: AABB, margin: number = 0): boolean {
    return !(
      box.x + box.width < this.x - margin ||
      box.x > this.x + this.width + margin ||
      box.y + box.height < this.y - margin ||
      box.y > this.y + this.height + margin
    );
  }
}
