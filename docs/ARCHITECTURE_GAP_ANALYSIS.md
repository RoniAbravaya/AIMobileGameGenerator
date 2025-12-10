# Architecture Gap Analysis: Current vs. Desired State

**Date**: December 9, 2025  
**Purpose**: Compare existing implementation with new vision for truly dynamic game generation

---

## 🎯 Vision Summary

**Current System**: Fixed 5-game-type template system (Runner, Puzzle, Word, Card, Platformer)  
**Desired System**: Dynamic, LLM-driven game generation where each game has unique mechanics and visuals

---

## ❌ CRITICAL MISALIGNMENT: Fixed Templates vs. Dynamic Generation

### Current Architecture (PROBLEM)

```
Agent generates game by:
1. User selects one of 5 fixed types (runner/puzzle/word/card/platformer)
2. Agent copies template with that type's pre-built engine
3. AI generates minor code variations
4. Result: 5 distinct game types, but limited to these 5 mechanics
```

**Files that embody this limitation**:
- `game-template/app/game/config/gameTypes.ts` - Hardcoded 5 types
- `game-template/app/game/GameEngineFactory.tsx` - Switch statement for 5 types
- `game-template/app/game/types/runner/RunnerEngine.tsx` - Pre-built runner mechanics
- `game-template/app/game/types/puzzle/PuzzleEngine.tsx` - Pre-built puzzle mechanics
- (+ 3 more pre-built engines)

### Desired Architecture (SOLUTION)

```
Agent generates game by:
1. LLM invents a NEW GameSpec (mechanics, theme, genre)
2. Agent interprets GameSpec and generates custom mechanics code
3. Agent generates multiple AI images for that specific game
4. Result: Potentially infinite unique games, not limited to 5 templates
```

**Required new structure**:
- `agent/src/models/GameSpec.ts` - Structured game description model
- `agent/src/prompts/gameSpecPrompt.ts` - LLM prompt to invent games
- `agent/src/generators/mechanicsGenerator.ts` - Code generator from GameSpec
- `game-template/app/game/runtime/` - Generic game runtime (NOT pre-built engines)

---

## 📊 Feature-by-Feature Comparison

### 1. Navigation Flow

#### Current State: ❌ MISSING SPLASH SCREEN

**What exists**:
```typescript
// app/index.tsx
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu'); // Starts at menu!
  // ...
  {currentScreen === 'menu' && <MenuScreen ... />}
  {currentScreen === 'game' && <GameScreen ... />}
  {currentScreen === 'shop' && <ShopScreen ... />}
}
```

**Problems**:
- App starts directly at MenuScreen (no splash)
- No asset preloading phase
- No branded launch experience

#### Required State: ✅ Splash → Menu → Level Select → Game

**Needed**:
```typescript
// app/index.tsx
const [currentScreen, setCurrentScreen] = useState<Screen>('splash'); // NEW!

{currentScreen === 'splash' && <SplashScreen onComplete={() => setCurrentScreen('menu')} />}
{currentScreen === 'menu' && <MenuScreen ... />}
{currentScreen === 'levelSelect' && <LevelSelectScreen ... />} // NEW! Split from menu
{currentScreen === 'game' && <GameScreen ... />}
```

**Missing files**:
- `app/screens/SplashScreen.tsx` - Shows AI-generated splash, preloads assets
- `app/screens/LevelSelectScreen.tsx` - Currently embedded in MenuScreen

---

### 2. Game Specification Model

#### Current State: ❌ NO GAMESPEC - Uses fixed enum

**What exists**:
```typescript
// agent/src/types/index.ts
export enum GameType {
  RUNNER = 'runner',
  PLATFORMER = 'platformer',
  PUZZLE = 'puzzle',
  WORD = 'word',
  CARD = 'card'
}

export interface GameConfig {
  id: string;
  name: string;
  packageName: string;
  gameType: GameType; // Limited to 5 options!
  theme: string; // Just a string, no structure
  mechanics: string; // Just a string, not machine-readable
  // ...
}
```

**Problems**:
- `gameType` is an enum, not freeform
- No structured mechanics description
- No entity/behavior model
- No visual theme object
- Agent can't generate novel mechanics

#### Required State: ✅ Structured GameSpec model

**Needed**:
```typescript
// agent/src/models/GameSpec.ts
export interface GameSpec {
  id: string;
  name: string;
  highConcept: string;
  tags: string[];
  
  mechanics: {
    genre: string; // Freeform! e.g. "gravity-flip platformer"
    camera: "fixed" | "vertical_scroll" | "horizontal_scroll";
    controls: ("tap" | "double_tap" | "long_press" | "drag" | "swipe" | "virtual_buttons")[];
    coreLoop: string;
    winCondition: string;
    loseCondition: string;
    entities: Array<{
      name: string;
      role: "player" | "enemy" | "obstacle" | "pickup";
      behavior: string;
    }>;
    scoring: {
      primaryMetric: string;
      description: string;
    };
  };
  
  visualTheme: {
    mood: string; // e.g. "neon cyberpunk", "pastel zen"
    paletteHint: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    uiStyle: string;
    fontStyleHint: string;
    iconographyHint: string;
  };
  
  levels: Array<{
    id: number;
    name: string;
    difficulty: "easy" | "medium" | "hard" | "very_hard";
    shortDescription: string;
    parameters: Record<string, number | string>;
  }>;
}
```

**Missing files**:
- `agent/src/models/GameSpec.ts` - Type definition
- `agent/src/validators/gameSpecValidator.ts` - Runtime validation
- `game-spec.json` - Should exist in every generated game repo

---

### 3. LLM Prompt for Game Design

#### Current State: ❌ NO GAME DESIGN PROMPT

**What exists**:
```typescript
// agent/src/services/ai.service.ts
async generateGame(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const prompt = this.buildGameGenerationPrompt(request);
  // This prompt just generates CODE for a pre-selected game type
  // It does NOT invent new game mechanics
}
```

The current `buildGameGenerationPrompt` assumes you already know the game type and just generates implementation code.

#### Required State: ✅ LLM invents the GameSpec first

**Needed**:
```typescript
// agent/src/prompts/gameSpecPrompt.ts
export function buildGameSpecPrompt(
  previousGames: Array<{ id: string; name: string; highConcept: string; tags: string[] }>,
  userHints?: { tone?: string; difficulty?: string; }
): string {
  return `You are a senior mobile 2D game designer...
  
  Previously generated games:
  ${JSON.stringify(previousGames, null, 2)}
  
  Design a NEW game that is DIFFERENT from these.
  
  Constraints:
  - 2D only (no 3D)
  - Simple controls: tap, swipe, drag, buttons
  - Implementable in React Native with simple 2D logic
  - No licensed IP
  
  Return a JSON matching this GameSpec interface:
  ${GAMESPEC_SCHEMA}
  `;
}

// agent/src/services/ai.service.ts
async generateGameSpec(
  previousGames: GameSpec[],
  userHints?: any
): Promise<GameSpec> {
  const prompt = buildGameSpecPrompt(previousGames, userHints);
  const response = await this.client.messages.create({...});
  return JSON.parse(response); // Returns GameSpec, not code!
}
```

**Missing files**:
- `agent/src/prompts/gameSpecPrompt.ts` - Prompt builder
- `agent/src/services/ai.service.ts` - Needs new `generateGameSpec()` method

---

### 4. Mechanics Code Generation

#### Current State: ❌ Pre-built engines (5 fixed types)

**What exists**:
```
game-template/app/game/types/
├── runner/RunnerEngine.tsx     - 200+ lines of runner logic
├── puzzle/PuzzleEngine.tsx     - 200+ lines of match-3 logic
├── word/WordEngine.tsx         - 200+ lines of word game logic
├── card/CardEngine.tsx         - 200+ lines of card game logic
└── platformer/PlatformerEngine.tsx - 200+ lines of platformer logic
```

These are **fully implemented game engines** with hardcoded mechanics.

**Problems**:
- Agent just picks one of these 5 and copies it
- Cannot create new mechanics not in these 5
- To add a 6th game type, you must manually write a new engine

#### Required State: ✅ Generated mechanics from GameSpec

**Needed**:
```typescript
// agent/src/generators/mechanicsGenerator.ts
export class MechanicsGenerator {
  async generateFromGameSpec(spec: GameSpec): Promise<{
    gameLogic: string;    // TypeScript code
    entities: string;     // TypeScript code
    controls: string;     // TypeScript code
  }> {
    // Use an LLM to generate code based on spec.mechanics
    const prompt = `
      Generate React Native TypeScript code for a 2D mobile game with these mechanics:
      
      Genre: ${spec.mechanics.genre}
      Camera: ${spec.mechanics.camera}
      Controls: ${spec.mechanics.controls.join(', ')}
      Core Loop: ${spec.mechanics.coreLoop}
      Entities: ${JSON.stringify(spec.mechanics.entities)}
      Win Condition: ${spec.mechanics.winCondition}
      Lose Condition: ${spec.mechanics.loseCondition}
      
      Generate:
      1. gameLogic.ts - Main game loop, update logic, collision detection
      2. entities.ts - Entity classes/types for player, enemies, obstacles, pickups
      3. controls.ts - Input handlers for specified controls
      
      Use simple 2D math, no complex physics libraries.
    `;
    
    // Call LLM, parse response, return code strings
  }
}
```

**Then in the game template**:
```
game-template/app/game/
├── runtime/                    - NEW! Generic runtime
│   ├── GameRuntime.tsx        - Generic game loop shell
│   ├── physics2d.ts           - Simple 2D helpers (AABB collision, velocity, etc.)
│   ├── input.ts               - Input event handlers
│   └── rendering.ts           - Simple 2D rendering helpers
└── generated/                  - NEW! Per-game generated code
    ├── gameLogic.ts           - Generated from GameSpec
    ├── entities.ts            - Generated from GameSpec
    └── controls.ts            - Generated from GameSpec
```

**Missing**:
- `agent/src/generators/mechanicsGenerator.ts` - Code generator
- `game-template/app/game/runtime/` - Generic runtime infrastructure
- Template structure for generated code
- All 5 pre-built engines should be REMOVED (or used as examples only)

---

### 5. Theme System

#### Current State: ⚠️ PARTIAL - Has themes but tied to fixed game types

**What exists**:
```typescript
// game-template/app/game/config/gameTypes.ts
export const RUNNER_CONFIG: GameTypeConfig = {
  theme: {
    colors: { primary: '#00ffff', secondary: '#ff00ff', ... },
    fonts: { title: 'Orbitron', body: 'Rajdhani', ... },
    // ...
  }
};
// + 4 more hardcoded theme configs
```

**Problems**:
- Themes are hardcoded per game type
- Only 5 themes exist
- No way to generate new themes dynamically

#### Required State: ✅ Theme generated from GameSpec.visualTheme

**Needed**:
```typescript
// game-template/app/theme/theme.ts
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    success: string;
    danger: string;
    // ...
  };
  typography: {
    baseFontFamily: string;
    headingFontFamily: string;
    fontSizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
  };
  layout: {
    borderRadius: {
      sm: number;
      md: number;
      lg: number;
    };
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    shadows: {
      small: any;
      medium: any;
      large: any;
    };
  };
  animation: {
    speedMultiplier: number;
    easingHint: string;
  };
}

// agent/src/generators/themeGenerator.ts
export function createThemeFromVisualTheme(visualTheme: GameSpec["visualTheme"]): Theme {
  // Convert paletteHint, uiStyle, fontStyleHint into concrete Theme
  // Use color palette libraries to generate harmonious shades
  // Map font hints to actual font families
  // Derive spacing/shadows from uiStyle
}
```

**Missing**:
- `game-template/app/theme/theme.ts` - Theme interface
- `game-template/app/theme/ThemeProvider.tsx` - React context
- `agent/src/generators/themeGenerator.ts` - Theme generator
- UI components must be refactored to read from theme context

---

### 6. AI Image Generation

#### Current State: ⚠️ PARTIAL - Has image service but generates only 2 images

**What exists**:
```typescript
// agent/src/services/image.service.ts
async generateGameImages(config: any): Promise<{
  splashPath: string;
  iconPath: string;
}> {
  // Generates:
  // 1. Splash screen (1080x1920)
  // 2. App icon (1024x1024)
  // That's it!
}
```

**Problems**:
- Only generates splash + icon
- No menu background
- No in-game backgrounds
- Prompts are basic, don't leverage full GameSpec

#### Required State: ✅ Multiple assets with GameSpec-aware prompts

**Needed**:
```typescript
// agent/src/services/image.service.ts
async generateGameAssets(spec: GameSpec): Promise<{
  splashPath: string;
  menuBackgroundPath: string;
  sceneBackgroundPath: string;
  iconPath: string;
  // Optionally: character sprites, UI elements
}> {
  const splashPrompt = buildSplashPrompt(spec);
  const menuPrompt = buildMenuBackgroundPrompt(spec);
  const scenePrompt = buildSceneBackgroundPrompt(spec);
  
  // Generate each with DALL-E or other service
  // Save to assets/generated/
}

function buildSplashPrompt(spec: GameSpec): string {
  return `Mobile game splash screen for "${spec.name}".
  
  High concept: ${spec.highConcept}
  Core gameplay: ${spec.mechanics.coreLoop}
  Visual mood: ${spec.visualTheme.mood}
  Color palette: ${spec.visualTheme.paletteHint.primary}, ${spec.visualTheme.paletteHint.secondary}
  Style: ${spec.visualTheme.uiStyle}
  
  Create a dynamic, eye-catching splash screen in ${spec.visualTheme.mood} style.
  Portrait orientation (9:16).`;
}
```

**Missing**:
- Multiple image generation functions
- GameSpec-aware prompt builders
- Asset management for multiple images
- Template screens must load these assets

---

### 7. Level System

#### Current State: ✅ MOSTLY CORRECT

**What exists**:
```typescript
// game-template/app/config/levels.ts
export const LEVELS: Level[] = [
  { id: 1, name: 'Getting Started', isPlayable: true, comingSoon: false, ... },
  { id: 2, name: 'Learning Curve', isPlayable: true, comingSoon: false, ... },
  { id: 3, name: 'First Challenge', isPlayable: true, comingSoon: false, ... },
  { id: 4, name: 'Advanced Trial', isPlayable: false, comingSoon: true, ... },
  // ... levels 5-10 similar (locked, coming soon)
];
```

**What's good**:
- ✅ 10 levels defined
- ✅ 3 playable, 7 locked
- ✅ Unlock progression works

**Needs adjustment**:
- Levels should be generated from `GameSpec.levels`
- Parameters should be game-specific (not hardcoded like `obstacles: 25`)

#### Required State: ✅ Levels generated from GameSpec

**Needed**:
```typescript
// agent/src/generators/levelGenerator.ts
export function generateLevelConfig(spec: GameSpec): string {
  const levelsCode = spec.levels.map((lvl, idx) => {
    const isPlayable = lvl.id <= 3;
    const comingSoon = lvl.id > 3;
    
    return `{
      id: ${lvl.id},
      name: "${lvl.name}",
      difficulty: "${lvl.difficulty}",
      shortDescription: "${lvl.shortDescription}",
      isPlayable: ${isPlayable},
      comingSoon: ${comingSoon},
      parameters: ${JSON.stringify(lvl.parameters)}
    }`;
  }).join(',\n  ');
  
  return `export const LEVELS = [\n  ${levelsCode}\n];`;
}
```

---

### 8. Agent Workflow

#### Current State: ⚠️ PARTIAL - Workflow exists but uses wrong model

**What exists**:
```typescript
// agent/src/orchestrator.ts
async generateGame(config: { name, type, theme, mechanics }): Promise<string> {
  // 1. Validate config
  // 2. Call ai.service.generateGame(config)  ← Uses fixed type
  // 3. Create repo from template
  // 4. Generate images
  // 5. Push to GitHub
}
```

**Problems**:
- Requires user to specify `type` (one of 5 fixed types)
- Doesn't call LLM to design the game first
- Doesn't generate GameSpec

#### Required State: ✅ GameSpec-driven workflow

**Needed**:
```typescript
// agent/src/orchestrator.ts
async generateGame(hints?: { tone?, difficulty? }): Promise<string> {
  // 1. Load previously generated GameSpecs
  const previousGames = await this.loadPreviousGameSpecs();
  
  // 2. Generate NEW GameSpec via LLM
  const gameSpec = await this.aiService.generateGameSpec(previousGames, hints);
  logger.info(`Generated GameSpec: ${gameSpec.name} - ${gameSpec.highConcept}`);
  
  // 3. Save GameSpec
  const gameId = gameSpec.id;
  await this.saveGameSpec(gameId, gameSpec);
  
  // 4. Generate theme from GameSpec.visualTheme
  const theme = this.themeGenerator.createTheme(gameSpec.visualTheme);
  
  // 5. Generate mechanics code from GameSpec.mechanics
  const mechanicsCode = await this.mechanicsGenerator.generate(gameSpec);
  
  // 6. Generate level config from GameSpec.levels
  const levelConfig = this.levelGenerator.generate(gameSpec.levels);
  
  // 7. Generate AI images using GameSpec
  const images = await this.imageService.generateGameAssets(gameSpec);
  
  // 8. Create repo from skeleton template
  const repoPath = await this.createGameRepo(gameId, gameSpec.name);
  
  // 9. Inject generated files
  await this.injectFiles(repoPath, {
    'game-spec.json': gameSpec,
    'app/theme/generatedTheme.ts': theme,
    'app/game/generated/gameLogic.ts': mechanicsCode.gameLogic,
    'app/game/generated/entities.ts': mechanicsCode.entities,
    'app/game/generated/controls.ts': mechanicsCode.controls,
    'app/config/levels.generated.ts': levelConfig,
    'assets/generated/splash.png': images.splashPath,
    'assets/generated/menu-bg.png': images.menuBackgroundPath,
    'assets/generated/scene-bg.png': images.sceneBackgroundPath,
  });
  
  // 10. Run tests
  await this.runTests(repoPath);
  
  // 11. Create GitHub repo and push
  await this.pushToGitHub(repoPath, gameSpec.name);
  
  return gameId;
}
```

**Missing**:
- `generateGameSpec()` method
- Mechanics code generator
- Level config generator
- Theme generator
- Proper file injection logic

---

### 9. CLI Commands

#### Current State: ⚠️ PARTIAL - Commands exist but need updating

**What exists**:
```bash
# Current usage:
npm run dev -- generate-game \
  --name "Neon Runner" \
  --type runner \           # ← Fixed type enum!
  --theme "cyberpunk city" \
  --mechanics "dodging"
```

#### Required State: ✅ Type is NOT required (LLM invents it)

**Needed**:
```bash
# New usage:
npm run dev -- generate-game \
  [--name "Awesome Game"] \  # Optional; LLM can propose name
  [--tone "neon cyberpunk"] \  # Hint to LLM
  [--difficulty "medium"] \    # Hint to LLM
  [--style "minimalist"]       # Hint to LLM

# Example:
npm run dev -- generate-game --tone "zen peaceful" --difficulty "easy"
# → LLM invents a zen peaceful easy game (maybe meditation puzzler)

npm run dev -- generate-game --tone "intense fast-paced" --difficulty "hard"
# → LLM invents intense action game (maybe bullet hell)

npm run dev -- generate-game
# → LLM invents completely random game with no hints
```

---

## 📁 File Structure Comparison

### Current Structure (Fixed Templates)

```
game-template/
├── app/
│   ├── game/
│   │   ├── types/                    ❌ Pre-built engines (delete!)
│   │   │   ├── runner/RunnerEngine.tsx
│   │   │   ├── puzzle/PuzzleEngine.tsx
│   │   │   ├── word/WordEngine.tsx
│   │   │   ├── card/CardEngine.tsx
│   │   │   └── platformer/PlatformerEngine.tsx
│   │   ├── config/
│   │   │   └── gameTypes.ts          ❌ Fixed enum (delete!)
│   │   ├── GameEngine.tsx
│   │   └── GameEngineFactory.tsx     ❌ Switch on fixed types (delete!)
│   ├── screens/
│   │   ├── MenuScreen.tsx            ⚠️ Starts here (no splash)
│   │   ├── GameScreen.tsx            ✅ OK
│   │   └── ShopScreen.tsx            ✅ OK
│   ├── index.tsx                     ⚠️ No splash screen
│   └── ... (monetization, hooks - OK)
└── assets/
    └── generated/                    ⚠️ Only splash + icon

agent/
└── src/
    ├── services/
    │   └── ai.service.ts             ⚠️ Generates code, not GameSpec
    ├── generators/
    │   └── game-generator.ts         ⚠️ Uses fixed types
    └── types/
        └── index.ts                  ❌ enum GameType (fixed 5)
```

### Required Structure (Dynamic Generation)

```
game-template/
├── app/
│   ├── navigation/                   ✨ NEW - Navigation system
│   │   ├── NavigationContainer.tsx
│   │   └── screens.ts
│   ├── theme/                        ✨ NEW - Theme system
│   │   ├── theme.ts                  - Theme interface
│   │   ├── ThemeProvider.tsx         - React context
│   │   └── generatedTheme.ts         - Generated per game
│   ├── game/
│   │   ├── runtime/                  ✨ NEW - Generic runtime
│   │   │   ├── GameRuntime.tsx       - Generic game loop shell
│   │   │   ├── physics2d.ts          - AABB, velocity, simple physics
│   │   │   ├── input.ts              - Input handlers
│   │   │   └── rendering.ts          - 2D rendering helpers
│   │   └── generated/                ✨ NEW - Per-game code
│   │       ├── gameLogic.ts          - Generated mechanics
│   │       ├── entities.ts           - Generated entities
│   │       └── controls.ts           - Generated input handling
│   ├── screens/
│   │   ├── SplashScreen.tsx          ✨ NEW - Shows splash, preloads
│   │   ├── MenuScreen.tsx            ⚠️ Update to use theme
│   │   ├── LevelSelectScreen.tsx     ✨ NEW - Split from menu
│   │   ├── GameScreen.tsx            ⚠️ Update to use generated code
│   │   ├── ResultScreen.tsx          ✨ NEW - Win/lose/continue
│   │   └── ShopScreen.tsx            ✅ OK
│   ├── config/
│   │   └── levels.generated.ts       ⚠️ Generated from GameSpec
│   ├── index.tsx                     ⚠️ Update nav flow
│   └── ... (monetization, hooks - OK)
├── assets/
│   └── generated/                    ⚠️ MORE ASSETS
│       ├── splash.png
│       ├── menu-bg.png               ✨ NEW
│       ├── scene-bg.png              ✨ NEW
│       ├── icon.png
│       └── adaptive-icon.png
└── game-spec.json                    ✨ NEW - GameSpec for this game

agent/
└── src/
    ├── models/                       ✨ NEW
    │   └── GameSpec.ts               - GameSpec interface
    ├── prompts/                      ✨ NEW
    │   ├── gameSpecPrompt.ts         - LLM prompt for designing games
    │   └── mechanicsPrompt.ts        - LLM prompt for generating code
    ├── validators/                   ✨ NEW
    │   └── gameSpecValidator.ts      - Runtime validation
    ├── generators/                   ⚠️ UPDATE
    │   ├── game-generator.ts         - Main orchestrator (UPDATE)
    │   ├── mechanicsGenerator.ts     ✨ NEW - Generate code from GameSpec
    │   ├── themeGenerator.ts         ✨ NEW - Generate theme
    │   └── levelGenerator.ts         ✨ NEW - Generate level config
    ├── services/
    │   ├── ai.service.ts             ⚠️ ADD generateGameSpec()
    │   └── image.service.ts          ⚠️ ADD more image types
    └── types/
        └── index.ts                  ⚠️ REMOVE enum GameType
```

---

## 🔴 Critical Issues Summary

### Issue #1: Fixed Game Type Enum (**BLOCKER**)

**Current**:
```typescript
export enum GameType {
  RUNNER = 'runner',
  PLATFORMER = 'platformer',
  PUZZLE = 'puzzle',
  WORD = 'word',
  CARD = 'card'
}
```

**Problem**: This enum limits the system to 5 game types. Cannot generate novel mechanics.

**Solution**: Remove enum entirely. Replace with freeform `genre: string` in GameSpec.

---

### Issue #2: Pre-built Game Engines (**BLOCKER**)

**Current**: 5 fully-implemented game engines (Runner, Puzzle, Word, Card, Platformer)

**Problem**: These are the FINAL OUTPUT, not a starting point. Agent just picks one.

**Solution**: Delete all 5 engines. Replace with:
- Generic runtime shell
- Code generator that interprets GameSpec and writes new mechanics

---

### Issue #3: No Splash Screen (**HIGH**)

**Current**: App starts at MenuScreen

**Problem**: No branded launch experience, no preloading phase

**Solution**: Add SplashScreen as first screen, show AI-generated splash image

---

### Issue #4: No GameSpec Model (**BLOCKER**)

**Current**: Uses simple config with fixed `type` field

**Problem**: Cannot describe arbitrary game mechanics to generate

**Solution**: Define GameSpec TypeScript interface with mechanics, visualTheme, levels

---

### Issue #5: No Game Design LLM Prompt (**BLOCKER**)

**Current**: LLM generates code for pre-selected game type

**Problem**: LLM never invents the game design itself

**Solution**: Create `gameSpecPrompt.ts` that asks LLM to design a complete game

---

### Issue #6: Limited AI Images (**MEDIUM**)

**Current**: Only splash + icon generated

**Problem**: Menu and gameplay backgrounds are generic

**Solution**: Generate menu-bg.png, scene-bg.png with GameSpec-aware prompts

---

### Issue #7: Theme Tied to Fixed Types (**MEDIUM**)

**Current**: 5 hardcoded themes (one per game type)

**Problem**: Only 5 visual styles possible

**Solution**: Generate theme dynamically from GameSpec.visualTheme

---

## 📋 Implementation Checklist

### Phase 1: Models & Prompts (Foundation)
- [ ] Create `agent/src/models/GameSpec.ts` interface
- [ ] Create `agent/src/prompts/gameSpecPrompt.ts` with full LLM prompt
- [ ] Create `agent/src/validators/gameSpecValidator.ts`
- [ ] Update `agent/src/types/index.ts` - REMOVE GameType enum
- [ ] Add `generateGameSpec()` method to ai.service.ts

### Phase 2: Navigation Flow
- [ ] Create `game-template/app/screens/SplashScreen.tsx`
- [ ] Create `game-template/app/screens/LevelSelectScreen.tsx` (split from menu)
- [ ] Create `game-template/app/screens/ResultScreen.tsx`
- [ ] Update `game-template/app/index.tsx` with Splash → Menu → LevelSelect → Game flow
- [ ] Add tests for navigation flow

### Phase 3: Generic Runtime (Remove Fixed Templates)
- [ ] Create `game-template/app/game/runtime/GameRuntime.tsx` - generic shell
- [ ] Create `game-template/app/game/runtime/physics2d.ts` - AABB, velocity helpers
- [ ] Create `game-template/app/game/runtime/input.ts` - tap/swipe/drag handlers
- [ ] Create `game-template/app/game/runtime/rendering.ts` - simple 2D helpers
- [ ] DELETE `game-template/app/game/types/` (all 5 pre-built engines)
- [ ] DELETE `game-template/app/game/GameEngineFactory.tsx` (switch statement)
- [ ] DELETE `game-template/app/game/config/gameTypes.ts` (fixed enum)

### Phase 4: Code Generation from GameSpec
- [ ] Create `agent/src/generators/mechanicsGenerator.ts`
- [ ] Create `agent/src/prompts/mechanicsPrompt.ts` - LLM prompt for code generation
- [ ] Implement `generateFromGameSpec()` - returns gameLogic.ts, entities.ts, controls.ts
- [ ] Create `game-template/app/game/generated/` folder structure
- [ ] Update `GameScreen.tsx` to use generated code instead of factory

### Phase 5: Theme System
- [ ] Create `game-template/app/theme/theme.ts` - Theme interface
- [ ] Create `game-template/app/theme/ThemeProvider.tsx` - React context
- [ ] Create `agent/src/generators/themeGenerator.ts`
- [ ] Implement `createThemeFromVisualTheme()` function
- [ ] Refactor all UI components to read from ThemeProvider
- [ ] Generate `app/theme/generatedTheme.ts` per game

### Phase 6: Enhanced Image Generation
- [ ] Update `agent/src/services/image.service.ts`:
  - [ ] Add `generateMenuBackground(spec: GameSpec)`
  - [ ] Add `generateSceneBackground(spec: GameSpec)`
  - [ ] Update prompts to use GameSpec.visualTheme + mechanics
- [ ] Update `SplashScreen` to show splash.png
- [ ] Update `MenuScreen` to show menu-bg.png
- [ ] Update game screens to show scene-bg.png

### Phase 7: Level Generation
- [ ] Create `agent/src/generators/levelGenerator.ts`
- [ ] Implement `generateLevelConfig(spec: GameSpec)` - returns TypeScript code
- [ ] Generate `app/config/levels.generated.ts` per game
- [ ] Update level select to read from generated config

### Phase 8: Agent Workflow Refactor
- [ ] Update `agent/src/orchestrator.ts`:
  - [ ] Add `loadPreviousGameSpecs()` method
  - [ ] Add `generateGameSpec()` step FIRST
  - [ ] Add theme generation step
  - [ ] Add mechanics code generation step
  - [ ] Add level config generation step
  - [ ] Add multi-image generation step
  - [ ] Update file injection to include all generated files
  - [ ] Save `game-spec.json` to repo root
- [ ] Update CLI to NOT require `--type` parameter
- [ ] Add `--tone`, `--style`, `--difficulty` as optional hints

### Phase 9: Testing & Validation
- [ ] Add tests for GameSpec validation
- [ ] Add tests for theme generation
- [ ] Add tests for navigation flow (Splash → Menu → etc.)
- [ ] Add tests for level config generation
- [ ] Add integration test: Generate 2 games, verify different GameSpecs
- [ ] Manual test: Generate 5 games, verify visual/mechanical diversity

### Phase 10: Documentation
- [ ] Update README with new architecture
- [ ] Update docs/SETUP.md with new workflow
- [ ] Create docs/GAMESPEC_GUIDE.md explaining the model
- [ ] Update docs/WORKFLOWS.md with new CLI usage
- [ ] Create examples/sample-gamespecs/ with 5-10 example GameSpecs

---

## 💡 Key Design Decisions Needed

### Decision #1: How complex can generated mechanics be?

**Option A**: Simple mechanics only (no pathfinding, no complex AI)  
**Option B**: Allow complex mechanics but generate them with multiple LLM calls  
**Recommendation**: Start with A, expand to B later

### Decision #2: How to handle LLM failures in mechanics generation?

**Option A**: Retry up to 3 times with refined prompts  
**Option B**: Fall back to a simple generic game if generation fails  
**Option C**: Fail fast and require manual intervention  
**Recommendation**: A + B (retry first, then safe fallback)

### Decision #3: Should GameSpec be editable after generation?

**Option A**: Read-only after generation  
**Option B**: Allow manual editing, then regenerate code  
**Recommendation**: B (useful for iteration)

### Decision #4: How to handle asset generation failures?

**Current**: Falls back to placeholder images (GOOD)  
**Keep this approach** - it's pragmatic

---

## 📊 Effort Estimate

### Current State: 60% complete for OLD vision (fixed templates)
### Required Refactoring: ~80-120 hours

**Breakdown**:
- Phase 1 (Models & Prompts): 8-12 hours
- Phase 2 (Navigation): 4-6 hours
- Phase 3 (Generic Runtime): 12-16 hours (**CRITICAL - most complex**)
- Phase 4 (Code Generation): 20-30 hours (**CRITICAL - most complex**)
- Phase 5 (Theme System): 8-12 hours
- Phase 6 (Enhanced Images): 4-6 hours
- Phase 7 (Level Generation): 4-6 hours
- Phase 8 (Agent Workflow): 12-16 hours
- Phase 9 (Testing): 8-12 hours
- Phase 10 (Documentation): 4-6 hours

**Total**: 84-122 hours (~2-3 weeks full-time)

---

## 🎯 Alignment Assessment

### Your Vision: ✅ Technically Feasible

**Strengths**:
- LLM-driven game design is proven (GPT-4, Claude can design games)
- Code generation from structured specs works well
- 2D constraint keeps it implementable
- React Native + Expo is flexible enough

**Challenges**:
- Quality control (some generated games may be unplayable)
- Testing generated code (harder than testing templates)
- LLM costs (more API calls per game)
- Complexity (more moving parts than fixed templates)

### Recommendation: **Proceed with phased approach**

1. **Prototype first** (Phase 1-4): Prove GameSpec → Code generation works
2. **Iterate** (Phase 5-7): Add theme/image/level generation
3. **Scale** (Phase 8-10): Full workflow + testing + docs

---

## 🔚 Conclusion

**Current System**: 60% complete for a fixed-template approach  
**Your Vision**: Requires 80% refactoring of current code  
**Alignment**: ❌ **MAJOR MISALIGNMENT** - Current system does not support your vision

**Core Issue**: The existing system is built around 5 pre-made game engines. Your vision requires **generating** those engines dynamically.

**Path Forward**:
1. Accept that most current game-specific code (5 engines, GameEngineFactory, fixed themes) must be deleted
2. Build new infrastructure: GameSpec model, LLM prompts, code generator, generic runtime
3. This is essentially a **new system** that reuses only skeleton pieces (navigation, monetization, build pipeline)

**Estimate**: 2-3 weeks to fully transition to new architecture

---

**Ready to proceed?** I can start with Phase 1 (Models & Prompts) if you approve this direction.
