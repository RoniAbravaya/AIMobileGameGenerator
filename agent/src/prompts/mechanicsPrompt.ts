/**
 * Mechanics Code Generation Prompt
 * 
 * Builds a comprehensive prompt for Claude to generate game mechanics code
 * from a GameSpec. The generated code uses the generic GameRuntime.
 */

import { GameSpec } from '../models/GameSpec';

/**
 * Build the mechanics generation prompt
 */
export function buildMechanicsPrompt(spec: GameSpec): string {
  return `You are an expert TypeScript and React Native game developer. Your task is to generate COMPLETE, WORKING game mechanics code for a mobile game based on the provided GameSpec.

## CRITICAL REQUIREMENTS

1. **Use the Generic Runtime**: The game MUST use our pre-built GameRuntime component and utilities
2. **No External Libraries**: ONLY use React, React Native, and our runtime (physics2d, input, rendering)
3. **Complete Implementation**: Every mechanic, entity, and control MUST be fully implemented
4. **Performance**: Target 60 FPS on mobile devices
5. **TypeScript Strict**: All code must pass TypeScript strict mode
6. **No Placeholders**: NO TODO comments, NO "implement later" notes

---

## GameSpec to Implement

\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

---

## Available Runtime APIs

### Physics (from './runtime/physics2d')
- \`Vector2D\` - 2D vector math
- \`PhysicsBody\` - Physics simulation (velocity, acceleration, forces)
- \`checkAABBCollision(a, b)\` - Rectangle collision
- \`checkCircleCollision(a, b)\` - Circle collision
- \`GRAVITY\` - Gravity constants (EARTH, LIGHT, HEAVY, NONE)
- \`clamp(value, min, max)\` - Math utilities
- \`random(min, max)\`, \`randomInt(min, max)\`

### Input (from './runtime/input')
- \`InputManager\` - Touch event system
- Events: 'tap', 'double_tap', 'long_press', 'swipe_up', 'swipe_down', 'swipe_left', 'swipe_right', 'drag_start', 'drag_move', 'drag_end'
- \`inputManager.on(event, callback)\` - Register handler

### Rendering (from './runtime/rendering')
- \`RenderQueue\` - Layer-sorted rendering
- \`createRect(id, x, y, w, h, color)\` - Rectangle shape
- \`createCircle(id, x, y, radius, color)\` - Circle shape
- \`createText(id, text, x, y, options)\` - Text label
- \`RenderLayer\` - BACKGROUND, GAME, FOREGROUND, UI
- \`Camera\` - For scrolling games
- \`ParticleSystem\` - Visual effects

### Game Loop (from './runtime/GameRuntime')
- \`GameRuntime\` - Main component
- \`useGameLifecycle(onUpdate, onRender, options)\` - Create lifecycle
- \`GameState\` - { running, paused, score, lives, level, time, gameOver, won }

---

## Output Structure

Generate THREE TypeScript files as separate code blocks:

### 1. gameLogic.ts
Main game logic file containing:
- Entity classes (player, obstacles, collectibles, etc.)
- Game state beyond the default GameState
- Update logic (movement, collisions, scoring, win/lose conditions)
- Level progression logic

### 2. entities.ts
Entity definitions from GameSpec.mechanics.entities:
- One class per entity type
- Properties matching GameSpec
- Update and collision methods
- Must use PhysicsBody for physics-based entities

### 3. GameScreen.tsx
The main game screen component:
- Imports gameLogic and entities
- Sets up GameRuntime with lifecycle hooks
- Implements onUpdate (call game logic)
- Implements onRender (draw all entities)
- Implements onInput (handle controls from GameSpec)
- Must have pause/resume buttons
- Must show score, lives, time

---

## Implementation Checklist

For each file, ensure:

### gameLogic.ts
- [x] Import all needed runtime utilities
- [x] Define game-specific state interface
- [x] Implement level initialization
- [x] Implement main update function (handles all entities)
- [x] Implement collision detection using runtime collision functions
- [x] Implement scoring based on GameSpec rules
- [x] Implement win condition from GameSpec
- [x] Implement lose condition from GameSpec
- [x] Level progression logic (advance to next level on win)
- [x] Reset logic (restart level on lose)

### entities.ts
- [x] One class per entity in GameSpec.mechanics.entities
- [x] Each entity has: position, velocity, size, state
- [x] Update method for movement/behavior
- [x] Collision bounds (AABB or Circle)
- [x] Use PhysicsBody for physics-based entities
- [x] Implement spawning logic if needed
- [x] Implement entity-specific behaviors

### GameScreen.tsx
- [x] Import GameRuntime and lifecycle hooks
- [x] Import gameLogic and entities
- [x] Set up game state with initialState
- [x] Implement onStart (initialize level)
- [x] Implement onUpdate (call game logic update)
- [x] Implement onRender (draw all entities, UI)
- [x] Implement onInput (controls from GameSpec)
- [x] Implement pause button
- [x] Implement game over screen (win/lose)
- [x] Implement restart button

---

## Specific Guidance Based on GameSpec

### High Concept: "${spec.highConcept}"

**Mechanics Summary**:
${spec.mechanics.description}

**Controls**: ${spec.mechanics.controls}

**Camera Type**: ${spec.mechanics.camera}
${spec.mechanics.camera === 'scrolling' ? '→ Use Camera class for scrolling' : '→ Fixed camera, no Camera needed'}
${spec.mechanics.camera === 'follow_player' ? '→ Use Camera.follow() for smooth tracking' : ''}

**Physics**: ${spec.mechanics.physics}
${spec.mechanics.physics === 'realistic' ? '→ Use PhysicsBody with gravity and forces' : ''}
${spec.mechanics.physics === 'arcade' ? '→ Simple velocity-based movement, minimal physics' : ''}
${spec.mechanics.physics === 'none' ? '→ Direct position manipulation, no physics' : ''}

**Win Condition**: ${spec.mechanics.winCondition}
**Lose Condition**: ${spec.mechanics.loseCondition}
**Scoring**: ${spec.mechanics.scoring}

### Entities to Implement

${spec.mechanics.entities.map(entity => `
**${entity.name}** (${entity.type})
- Behavior: ${entity.behavior}
- Properties: ${JSON.stringify(entity.properties)}
${entity.type === 'player' ? '→ This is the player-controlled entity' : ''}
${entity.type === 'obstacle' ? '→ Causes damage/death on collision' : ''}
${entity.type === 'collectible' ? '→ Awards points/power-ups when collected' : ''}
${entity.type === 'enemy' ? '→ AI-controlled, moves and attacks' : ''}
`).join('\n')}

### Levels to Implement

The game has ${spec.levels.length} levels total. Implement level selection, but only levels 1-3 are playable:
${spec.levels.slice(0, 3).map(level => `
**Level ${level.number}**: ${level.name}
- Difficulty: ${level.difficulty}
- Target: ${level.objective}
- Parameters: ${JSON.stringify(level.parameters)}
`).join('\n')}

Levels 4-${spec.levels.length} should show "Coming Soon" when selected.

---

## Code Style Requirements

- **TypeScript**: Strict types, no \`any\`
- **React Hooks**: Use hooks, not class components
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Comments**: Brief inline comments for complex logic only
- **Imports**: Organized (React → React Native → runtime → local)
- **Performance**: Avoid allocations in game loop, reuse objects

---

## Example Pattern (Reference Only)

\`\`\`typescript
// entities.ts
import { Vector2D, PhysicsBody, AABB } from '../runtime/physics2d';

export class Player {
  body: PhysicsBody;
  width: number = 40;
  height: number = 60;
  
  constructor(x: number, y: number) {
    this.body = new PhysicsBody(x, y);
    this.body.mass = 1;
  }
  
  update(deltaTime: number): void {
    this.body.update(deltaTime);
  }
  
  getBounds(): AABB {
    return {
      x: this.body.position.x - this.width / 2,
      y: this.body.position.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }
  
  jump(): void {
    this.body.velocity.y = -300;
  }
}

// gameLogic.ts
import { Player } from './entities';
import { checkAABBCollision, GRAVITY } from '../runtime/physics2d';
import { GameState } from '../runtime/GameRuntime';

export interface GameLogicState {
  player: Player;
  obstacles: Obstacle[];
  score: number;
}

let gameState: GameLogicState;

export function initLevel(level: number): void {
  gameState = {
    player: new Player(50, 100),
    obstacles: [],
    score: 0
  };
}

export function update(deltaTime: number, state: GameState): void {
  // Update player
  gameState.player.body.applyGravity(GRAVITY.EARTH);
  gameState.player.update(deltaTime);
  
  // Check collisions
  gameState.obstacles.forEach(obs => {
    if (checkAABBCollision(gameState.player.getBounds(), obs.getBounds())) {
      state.lives--;
      if (state.lives <= 0) {
        state.gameOver = true;
      }
    }
  });
  
  // Check win
  if (gameState.score >= 100) {
    state.won = true;
  }
}

export function getGameState(): GameLogicState {
  return gameState;
}

// GameScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import GameRuntime, { useGameLifecycle } from '../runtime/GameRuntime';
import { createRect, createText } from '../runtime/rendering';
import * as GameLogic from './gameLogic';

export default function GameScreen() {
  const lifecycle = useGameLifecycle(
    // onUpdate
    (deltaTime, state) => {
      GameLogic.update(deltaTime, state);
    },
    
    // onRender
    (renderQueue, state) => {
      const gameState = GameLogic.getGameState();
      
      // Draw player
      const player = gameState.player;
      renderQueue.add(createRect(
        'player',
        player.body.position.x,
        player.body.position.y,
        player.width,
        player.height,
        '#00FF00'
      ));
      
      // Draw UI
      renderQueue.add(createText('score', \`Score: \${state.score}\`, 10, 10));
    },
    
    // Options
    {
      onStart: () => {
        GameLogic.initLevel(1);
      },
      onInput: (inputManager) => {
        inputManager.on('tap', () => {
          GameLogic.getGameState().player.jump();
        });
      }
    }
  );
  
  return (
    <GameRuntime
      config={{ targetFPS: 60, enablePhysics: true, enableInput: true }}
      lifecycle={lifecycle}
    />
  );
}
\`\`\`

---

## IMPORTANT NOTES

1. **DO NOT** copy the example pattern directly - it's just a reference
2. **IMPLEMENT** the actual GameSpec mechanics, not the example
3. **USE** the exact entity types, properties, and behaviors from the GameSpec
4. **FOLLOW** the GameSpec's controls, win/lose conditions, and scoring exactly
5. **ENSURE** the game is actually playable and fun based on the high concept
6. **TEST** mentally that the logic flow makes sense (spawn → update → collision → score → win/lose)

---

## Output Format

Provide EXACTLY THREE code blocks with these labels:

\`\`\`typescript
// FILE: entities.ts
[entity code here]
\`\`\`

\`\`\`typescript
// FILE: gameLogic.ts
[game logic code here]
\`\`\`

\`\`\`typescript
// FILE: GameScreen.tsx
[game screen component here]
\`\`\`

Generate complete, production-ready code now.`;
}

/**
 * Parse mechanics response from LLM
 * Extracts the three generated files
 */
export interface GeneratedMechanics {
  entities: string;
  gameLogic: string;
  gameScreen: string;
}

export function parseMechanicsResponse(response: string): GeneratedMechanics {
  // Extract code blocks
  const codeBlockRegex = /```(?:typescript|ts)?\s*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    blocks.push(match[1].trim());
  }

  if (blocks.length < 3) {
    throw new Error(
      `Expected 3 code blocks (entities, gameLogic, gameScreen), got ${blocks.length}`
    );
  }

  // Identify files by looking for FILE: comments or exports
  const files: GeneratedMechanics = {
    entities: '',
    gameLogic: '',
    gameScreen: ''
  };

  for (const block of blocks) {
    const cleaned = block.trim();
    
    // Check for FILE: comment
    if (cleaned.includes('FILE: entities.ts')) {
      files.entities = cleanFileContent(cleaned);
    } else if (cleaned.includes('FILE: gameLogic.ts')) {
      files.gameLogic = cleanFileContent(cleaned);
    } else if (cleaned.includes('FILE: GameScreen.tsx')) {
      files.gameScreen = cleanFileContent(cleaned);
    }
    // Fallback: detect by exports/content
    else if (cleaned.includes('export class') && !files.entities) {
      files.entities = cleaned;
    } else if (cleaned.includes('export function') && !files.gameLogic) {
      files.gameLogic = cleaned;
    } else if (cleaned.includes('export default function') && !files.gameScreen) {
      files.gameScreen = cleaned;
    }
  }

  // Validate all files are present
  if (!files.entities || !files.gameLogic || !files.gameScreen) {
    throw new Error(
      'Failed to extract all required files. Missing: ' +
      [
        !files.entities && 'entities.ts',
        !files.gameLogic && 'gameLogic.ts',
        !files.gameScreen && 'GameScreen.tsx'
      ]
        .filter(Boolean)
        .join(', ')
    );
  }

  return files;
}

/**
 * Clean file content (remove FILE: comments, etc.)
 */
function cleanFileContent(content: string): string {
  // Remove FILE: comment line if present
  const lines = content.split('\n');
  const filtered = lines.filter(line => !line.trim().startsWith('// FILE:'));
  return filtered.join('\n').trim();
}

/**
 * Validate generated mechanics code
 * Checks for common issues before saving
 */
export interface MechanicsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGeneratedMechanics(
  mechanics: GeneratedMechanics
): MechanicsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check entities.ts
  if (!mechanics.entities.includes('export class')) {
    errors.push('entities.ts: No exported classes found');
  }
  if (mechanics.entities.includes('TODO') || mechanics.entities.includes('FIXME')) {
    errors.push('entities.ts: Contains TODO/FIXME placeholders');
  }

  // Check gameLogic.ts
  if (!mechanics.gameLogic.includes('export function')) {
    errors.push('gameLogic.ts: No exported functions found');
  }
  if (!mechanics.gameLogic.includes('initLevel') && !mechanics.gameLogic.includes('initialize')) {
    warnings.push('gameLogic.ts: No initLevel/initialize function found');
  }
  if (!mechanics.gameLogic.includes('update')) {
    errors.push('gameLogic.ts: No update function found');
  }
  if (mechanics.gameLogic.includes('TODO') || mechanics.gameLogic.includes('FIXME')) {
    errors.push('gameLogic.ts: Contains TODO/FIXME placeholders');
  }

  // Check GameScreen.tsx
  if (!mechanics.gameScreen.includes('export default')) {
    errors.push('GameScreen.tsx: No default export found');
  }
  if (!mechanics.gameScreen.includes('GameRuntime')) {
    errors.push('GameScreen.tsx: Does not use GameRuntime component');
  }
  if (!mechanics.gameScreen.includes('useGameLifecycle')) {
    warnings.push('GameScreen.tsx: Does not use useGameLifecycle hook');
  }
  if (!mechanics.gameScreen.includes('onUpdate')) {
    errors.push('GameScreen.tsx: No onUpdate lifecycle handler');
  }
  if (!mechanics.gameScreen.includes('onRender')) {
    errors.push('GameScreen.tsx: No onRender lifecycle handler');
  }
  if (mechanics.gameScreen.includes('TODO') || mechanics.gameScreen.includes('FIXME')) {
    errors.push('GameScreen.tsx: Contains TODO/FIXME placeholders');
  }

  // Check imports
  const allCode = mechanics.entities + mechanics.gameLogic + mechanics.gameScreen;
  if (!allCode.includes("from '../runtime/") && !allCode.includes("from './runtime/")) {
    errors.push('No imports from runtime found (should use physics2d, input, rendering, GameRuntime)');
  }

  // Check for external libraries (not allowed)
  const bannedImports = [
    'matter-js',
    'planck-js',
    'react-native-game-engine',
    'pixi',
    'phaser',
    'three'
  ];
  
  for (const lib of bannedImports) {
    if (allCode.includes(lib)) {
      errors.push(`Uses banned external library: ${lib}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get suggested fixes for common issues
 */
export function getSuggestedFixes(validation: MechanicsValidationResult): string {
  if (validation.valid) return '';

  let fixes = '## Suggested Fixes\n\n';

  for (const error of validation.errors) {
    if (error.includes('No exported classes')) {
      fixes += '- Add entity classes: `export class Player { ... }`\n';
    }
    if (error.includes('No update function')) {
      fixes += '- Add update function: `export function update(deltaTime: number, state: GameState) { ... }`\n';
    }
    if (error.includes('Does not use GameRuntime')) {
      fixes += '- Use GameRuntime: `<GameRuntime config={...} lifecycle={...} />`\n';
    }
    if (error.includes('No onUpdate lifecycle')) {
      fixes += '- Add onUpdate: `onUpdate: (deltaTime, state) => { ... }`\n';
    }
    if (error.includes('No onRender lifecycle')) {
      fixes += '- Add onRender: `onRender: (renderQueue, state) => { ... }`\n';
    }
    if (error.includes('TODO/FIXME')) {
      fixes += '- Replace all TODO/FIXME with actual implementation\n';
    }
  }

  return fixes;
}
