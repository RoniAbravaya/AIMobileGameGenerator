/**
 * Mechanics Patterns
 * 
 * These are NOT pre-built game types, but rather PATTERN TEMPLATES
 * that demonstrate how to implement common mechanics using the runtime.
 * 
 * The LLM can reference these patterns when generating new mechanics.
 */

/**
 * Pattern categories
 */
export enum MechanicsPattern {
  // Movement patterns
  AUTO_SCROLL = 'auto_scroll',
  PLAYER_CONTROLLED = 'player_controlled',
  PHYSICS_BASED = 'physics_based',
  ORBIT_ROTATION = 'orbit_rotation',
  
  // Collision patterns
  BOUNDARY_COLLISION = 'boundary_collision',
  ENTITY_COLLISION = 'entity_collision',
  GRID_COLLISION = 'grid_collision',
  
  // Spawning patterns
  TIMED_SPAWN = 'timed_spawn',
  RANDOM_SPAWN = 'random_spawn',
  WAVE_SPAWN = 'wave_spawn',
  
  // Scoring patterns
  DISTANCE_BASED = 'distance_based',
  COLLECTION_BASED = 'collection_based',
  TIME_BASED = 'time_based',
  COMBO_BASED = 'combo_based',
  
  // Win/lose patterns
  REACH_TARGET = 'reach_target',
  SURVIVE_DURATION = 'survive_duration',
  ELIMINATE_ENEMIES = 'eliminate_enemies',
  COLLECT_ALL = 'collect_all'
}

/**
 * Pattern code snippets
 */
export const PATTERN_SNIPPETS = {
  // AUTO SCROLL
  [MechanicsPattern.AUTO_SCROLL]: `
// Auto-scroll pattern (runner games)
const scrollSpeed = 200; // pixels per second

function update(deltaTime: number): void {
  // Move camera forward automatically
  camera.x += scrollSpeed * deltaTime;
  
  // Move all obstacles backward (relative to camera)
  obstacles.forEach(obs => {
    obs.x -= scrollSpeed * deltaTime;
    
    // Remove obstacles that went off-screen
    if (obs.x < camera.x - 100) {
      obstacles.splice(obstacles.indexOf(obs), 1);
    }
  });
}
`,

  // PLAYER CONTROLLED
  [MechanicsPattern.PLAYER_CONTROLLED]: `
// Player-controlled movement (direct input)
function setupInput(inputManager: InputManager): void {
  inputManager.on('swipe_up', () => {
    player.targetLane = Math.max(0, player.currentLane - 1);
  });
  
  inputManager.on('swipe_down', () => {
    player.targetLane = Math.min(maxLanes - 1, player.currentLane + 1);
  });
}

function update(deltaTime: number): void {
  // Smooth lane transitions
  const targetY = player.targetLane * laneHeight;
  player.y += (targetY - player.y) * 0.1;
}
`,

  // PHYSICS BASED
  [MechanicsPattern.PHYSICS_BASED]: `
// Physics-based movement (gravity, forces)
class PhysicsPlayer {
  body: PhysicsBody;
  
  constructor(x: number, y: number) {
    this.body = new PhysicsBody(x, y);
    this.body.mass = 1;
    this.body.friction = 0.05;
  }
  
  jump(): void {
    this.body.applyForce(new Vector2D(0, -500));
  }
  
  update(deltaTime: number): void {
    // Apply gravity
    this.body.applyGravity(GRAVITY.EARTH);
    
    // Update physics
    this.body.update(deltaTime);
    
    // Clamp to ground
    if (this.body.position.y > groundY) {
      this.body.position.y = groundY;
      this.body.velocity.y = 0;
    }
  }
}
`,

  // ORBIT ROTATION
  [MechanicsPattern.ORBIT_ROTATION]: `
// Orbital rotation pattern (circular movement)
class OrbitingPlayer {
  angle: number = 0;
  radius: number = 100;
  centerX: number;
  centerY: number;
  angularVelocity: number = 2; // radians per second
  
  constructor(centerX: number, centerY: number) {
    this.centerX = centerX;
    this.centerY = centerY;
  }
  
  update(deltaTime: number): void {
    // Rotate around center
    this.angle += this.angularVelocity * deltaTime;
    
    // Calculate position
    const x = this.centerX + Math.cos(this.angle) * this.radius;
    const y = this.centerY + Math.sin(this.angle) * this.radius;
    
    this.position = { x, y };
  }
  
  jump(): void {
    // Temporarily increase radius
    this.radius += 30;
    setTimeout(() => this.radius -= 30, 200);
  }
}
`,

  // BOUNDARY COLLISION
  [MechanicsPattern.BOUNDARY_COLLISION]: `
// Boundary collision (keep entities in bounds)
function checkBoundaryCollision(entity: Entity, bounds: AABB): void {
  const entityBounds = entity.getBounds();
  
  // Check left/right
  if (entityBounds.x < bounds.x) {
    entity.x = bounds.x;
    entity.velocityX = 0;
  } else if (entityBounds.x + entityBounds.width > bounds.x + bounds.width) {
    entity.x = bounds.x + bounds.width - entityBounds.width;
    entity.velocityX = 0;
  }
  
  // Check top/bottom
  if (entityBounds.y < bounds.y) {
    entity.y = bounds.y;
    entity.velocityY = 0;
  } else if (entityBounds.y + entityBounds.height > bounds.y + bounds.height) {
    entity.y = bounds.y + bounds.height - entityBounds.height;
    entity.velocityY = 0;
  }
}
`,

  // ENTITY COLLISION
  [MechanicsPattern.ENTITY_COLLISION]: `
// Entity collision detection
function checkEntityCollisions(): void {
  const playerBounds = player.getBounds();
  
  // Check obstacles
  obstacles.forEach(obstacle => {
    if (checkAABBCollision(playerBounds, obstacle.getBounds())) {
      handleObstacleHit(obstacle);
    }
  });
  
  // Check collectibles
  collectibles.forEach((collectible, index) => {
    if (checkAABBCollision(playerBounds, collectible.getBounds())) {
      handleCollectiblePickup(collectible);
      collectibles.splice(index, 1);
    }
  });
}

function handleObstacleHit(obstacle: Obstacle): void {
  player.lives--;
  player.invulnerable = true;
  setTimeout(() => player.invulnerable = false, 1000);
}

function handleCollectiblePickup(collectible: Collectible): void {
  score += collectible.value;
}
`,

  // TIMED SPAWN
  [MechanicsPattern.TIMED_SPAWN]: `
// Timed spawning (spawn every X seconds)
let spawnTimer = 0;
const spawnInterval = 2; // seconds

function update(deltaTime: number): void {
  spawnTimer += deltaTime;
  
  if (spawnTimer >= spawnInterval) {
    spawnObstacle();
    spawnTimer = 0;
  }
}

function spawnObstacle(): void {
  const x = camera.x + screenWidth + 50;
  const y = randomInt(50, screenHeight - 50);
  obstacles.push(new Obstacle(x, y));
}
`,

  // RANDOM SPAWN
  [MechanicsPattern.RANDOM_SPAWN]: `
// Random spawning (probability-based)
const spawnProbability = 0.02; // 2% chance per frame

function update(deltaTime: number): void {
  if (Math.random() < spawnProbability) {
    spawnObstacle();
  }
}

function spawnObstacle(): void {
  const x = camera.x + screenWidth + 50;
  const lane = randomInt(0, numLanes - 1);
  const y = lane * laneHeight;
  obstacles.push(new Obstacle(x, y));
}
`,

  // DISTANCE BASED SCORING
  [MechanicsPattern.DISTANCE_BASED]: `
// Distance-based scoring
let lastScorePosition = 0;
const scorePerUnit = 1; // points per 10 pixels

function update(deltaTime: number): void {
  // Award points for distance traveled
  const distanceTraveled = camera.x - lastScorePosition;
  
  if (distanceTraveled >= 10) {
    score += scorePerUnit;
    lastScorePosition = camera.x;
  }
}
`,

  // COLLECTION BASED SCORING
  [MechanicsPattern.COLLECTION_BASED]: `
// Collection-based scoring (coins, gems, etc.)
function handleCollectiblePickup(collectible: Collectible): void {
  // Add score based on collectible type
  score += collectible.value;
  
  // Check for combo
  comboTimer = Date.now();
  comboCount++;
  
  if (comboCount >= 3) {
    // Combo bonus
    score += comboCount * 10;
  }
}

function update(deltaTime: number): void {
  // Reset combo if too much time passes
  if (Date.now() - comboTimer > 2000) {
    comboCount = 0;
  }
}
`,

  // REACH TARGET
  [MechanicsPattern.REACH_TARGET]: `
// Reach target score/distance to win
function checkWinCondition(state: GameState): void {
  if (score >= targetScore) {
    state.won = true;
  }
  
  // Or distance-based:
  // if (camera.x >= levelDistance) {
  //   state.won = true;
  // }
}
`,

  // SURVIVE DURATION
  [MechanicsPattern.SURVIVE_DURATION]: `
// Survive for X seconds to win
const targetDuration = 60; // seconds

function checkWinCondition(state: GameState): void {
  if (state.time >= targetDuration) {
    state.won = true;
  }
}
`,

  // ELIMINATE ENEMIES
  [MechanicsPattern.ELIMINATE_ENEMIES]: `
// Eliminate all enemies to win
function checkWinCondition(state: GameState): void {
  if (enemies.length === 0 && !spawningEnemies) {
    state.won = true;
  }
}

function handleEnemyDestroyed(enemy: Enemy): void {
  enemies.splice(enemies.indexOf(enemy), 1);
  score += enemy.scoreValue;
}
`
};

/**
 * Get relevant patterns for a GameSpec
 */
export function getRelevantPatterns(spec: any): MechanicsPattern[] {
  const patterns: MechanicsPattern[] = [];
  const mechanics = spec.mechanics;

  // Movement patterns
  if (mechanics.camera === 'scrolling') {
    patterns.push(MechanicsPattern.AUTO_SCROLL);
  }
  if (mechanics.physics === 'realistic' || mechanics.physics === 'arcade') {
    patterns.push(MechanicsPattern.PHYSICS_BASED);
  }
  if (mechanics.controls?.includes('orbit') || mechanics.description?.includes('orbit')) {
    patterns.push(MechanicsPattern.ORBIT_ROTATION);
  }
  if (mechanics.controls?.includes('swipe') || mechanics.controls?.includes('drag')) {
    patterns.push(MechanicsPattern.PLAYER_CONTROLLED);
  }

  // Collision patterns
  patterns.push(MechanicsPattern.BOUNDARY_COLLISION);
  patterns.push(MechanicsPattern.ENTITY_COLLISION);

  // Spawning patterns
  if (mechanics.entities?.some((e: any) => e.type === 'obstacle' || e.type === 'enemy')) {
    patterns.push(MechanicsPattern.TIMED_SPAWN);
    patterns.push(MechanicsPattern.RANDOM_SPAWN);
  }

  // Scoring patterns
  if (mechanics.scoring?.includes('distance')) {
    patterns.push(MechanicsPattern.DISTANCE_BASED);
  }
  if (mechanics.scoring?.includes('collect')) {
    patterns.push(MechanicsPattern.COLLECTION_BASED);
  }
  if (mechanics.scoring?.includes('time')) {
    patterns.push(MechanicsPattern.TIME_BASED);
  }

  // Win/lose patterns
  if (mechanics.winCondition?.includes('score') || mechanics.winCondition?.includes('distance')) {
    patterns.push(MechanicsPattern.REACH_TARGET);
  }
  if (mechanics.winCondition?.includes('survive') || mechanics.winCondition?.includes('time')) {
    patterns.push(MechanicsPattern.SURVIVE_DURATION);
  }
  if (mechanics.winCondition?.includes('eliminate') || mechanics.winCondition?.includes('defeat')) {
    patterns.push(MechanicsPattern.ELIMINATE_ENEMIES);
  }

  return patterns;
}

/**
 * Get pattern examples as string for prompt
 */
export function getPatternsAsString(patterns: MechanicsPattern[]): string {
  if (patterns.length === 0) return '';

  let output = '## Relevant Mechanics Patterns\n\n';
  output += 'Here are some pattern examples that may be useful for this game:\n\n';

  for (const pattern of patterns) {
    output += `### ${pattern.toUpperCase().replace(/_/g, ' ')}\n`;
    output += PATTERN_SNIPPETS[pattern] || '';
    output += '\n';
  }

  output += '\n**Note**: These are EXAMPLES only. Adapt them to fit the GameSpec.\n\n';

  return output;
}

/**
 * Augment mechanics prompt with relevant patterns
 */
export function addPatternsToPrompt(basePrompt: string, spec: any): string {
  const patterns = getRelevantPatterns(spec);
  const patternsString = getPatternsAsString(patterns);
  
  // Insert patterns before the output format section
  const insertMarker = '## Output Format';
  const parts = basePrompt.split(insertMarker);
  
  if (parts.length === 2) {
    return parts[0] + patternsString + insertMarker + parts[1];
  }
  
  // Fallback: append at the end
  return basePrompt + '\n\n' + patternsString;
}
