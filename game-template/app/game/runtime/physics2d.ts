/**
 * 2D Physics Helpers
 * Simple 2D math and physics utilities for mobile games
 * 
 * Provides:
 * - Vector2D class
 * - AABB collision detection
 * - Circle collision detection
 * - Velocity and acceleration helpers
 * - Simple gravity simulation
 */

/**
 * 2D Vector class
 */
export class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}

  /**
   * Add another vector
   */
  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another vector
   */
  subtract(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiply by scalar
   */
  multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  /**
   * Divide by scalar
   */
  divide(scalar: number): Vector2D {
    if (scalar === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  /**
   * Get magnitude (length)
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Normalize (unit vector)
   */
  normalize(): Vector2D {
    const mag = this.magnitude();
    if (mag === 0) return new Vector2D(0, 0);
    return this.divide(mag);
  }

  /**
   * Dot product
   */
  dot(other: Vector2D): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Distance to another vector
   */
  distanceTo(other: Vector2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Clone this vector
   */
  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Set values
   */
  set(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Create from angle and magnitude
   */
  static fromAngle(angle: number, magnitude: number = 1): Vector2D {
    return new Vector2D(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    );
  }

  /**
   * Lerp between two vectors
   */
  static lerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
    return new Vector2D(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t
    );
  }
}

/**
 * Axis-Aligned Bounding Box (AABB)
 */
export interface AABB {
  x: number;      // Top-left x
  y: number;      // Top-left y
  width: number;
  height: number;
}

/**
 * Circle shape
 */
export interface Circle {
  x: number;      // Center x
  y: number;      // Center y
  radius: number;
}

/**
 * Check AABB collision
 */
export function checkAABBCollision(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Check circle collision
 */
export function checkCircleCollision(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}

/**
 * Check circle vs AABB collision
 */
export function checkCircleAABBCollision(circle: Circle, box: AABB): boolean {
  // Find closest point on box to circle center
  const closestX = Math.max(box.x, Math.min(circle.x, box.x + box.width));
  const closestY = Math.max(box.y, Math.min(circle.y, box.y + box.height));

  // Calculate distance
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < circle.radius;
}

/**
 * Check point in AABB
 */
export function pointInAABB(x: number, y: number, box: AABB): boolean {
  return (
    x >= box.x &&
    x <= box.x + box.width &&
    y >= box.y &&
    y <= box.y + box.height
  );
}

/**
 * Check point in circle
 */
export function pointInCircle(x: number, y: number, circle: Circle): boolean {
  const dx = x - circle.x;
  const dy = y - circle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= circle.radius;
}

/**
 * Get AABB center
 */
export function getAABBCenter(box: AABB): Vector2D {
  return new Vector2D(
    box.x + box.width / 2,
    box.y + box.height / 2
  );
}

/**
 * Move AABB by velocity
 */
export function moveAABB(box: AABB, velocity: Vector2D, deltaTime: number): AABB {
  return {
    x: box.x + velocity.x * deltaTime,
    y: box.y + velocity.y * deltaTime,
    width: box.width,
    height: box.height
  };
}

/**
 * Clamp AABB to bounds
 */
export function clampAABB(box: AABB, bounds: AABB): AABB {
  return {
    x: Math.max(bounds.x, Math.min(box.x, bounds.x + bounds.width - box.width)),
    y: Math.max(bounds.y, Math.min(box.y, bounds.y + bounds.height - box.height)),
    width: box.width,
    height: box.height
  };
}

/**
 * Simple physics body
 */
export class PhysicsBody {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  mass: number;
  friction: number;
  restitution: number; // Bounciness (0 = no bounce, 1 = perfect bounce)

  constructor(x: number = 0, y: number = 0) {
    this.position = new Vector2D(x, y);
    this.velocity = new Vector2D(0, 0);
    this.acceleration = new Vector2D(0, 0);
    this.mass = 1;
    this.friction = 0.1;
    this.restitution = 0.5;
  }

  /**
   * Apply force
   */
  applyForce(force: Vector2D): void {
    // F = ma, so a = F/m
    const acceleration = force.divide(this.mass);
    this.acceleration = this.acceleration.add(acceleration);
  }

  /**
   * Update physics (call every frame)
   */
  update(deltaTime: number): void {
    // Update velocity with acceleration
    this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));

    // Apply friction
    this.velocity = this.velocity.multiply(1 - this.friction);

    // Update position with velocity
    this.position = this.position.add(this.velocity.multiply(deltaTime));

    // Reset acceleration
    this.acceleration.set(0, 0);
  }

  /**
   * Apply gravity
   */
  applyGravity(gravity: number = 9.8): void {
    this.applyForce(new Vector2D(0, gravity * this.mass));
  }

  /**
   * Bounce off boundary
   */
  bounceOffBoundary(bounds: AABB): void {
    // Bounce off left/right
    if (this.position.x < bounds.x || this.position.x > bounds.x + bounds.width) {
      this.velocity.x *= -this.restitution;
      this.position.x = Math.max(bounds.x, Math.min(this.position.x, bounds.x + bounds.width));
    }

    // Bounce off top/bottom
    if (this.position.y < bounds.y || this.position.y > bounds.y + bounds.height) {
      this.velocity.y *= -this.restitution;
      this.position.y = Math.max(bounds.y, Math.min(this.position.y, bounds.y + bounds.height));
    }
  }
}

/**
 * Simple gravity helper
 */
export const GRAVITY = {
  EARTH: 9.8,
  MOON: 1.6,
  MARS: 3.7,
  JUPITER: 24.8,
  LIGHT: 5,
  HEAVY: 15,
  NONE: 0
};

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map value from one range to another
 */
export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Random number between min and max
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if value is approximately equal (with epsilon)
 */
export function approximately(a: number, b: number, epsilon: number = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Get angle between two points
 */
export function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Get distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
