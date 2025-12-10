# Implementation Plan: Playable Games with AI Visuals & Diversity

## Overview
Transform the AI Mobile Game Generator from a template system into a fully functional generator that creates **diverse, playable games** with **AI-generated visuals**.

## Phase 1: 10-Level System with 3 Playable ✅

### Current State
- ✅ 3 levels defined in `game-template/app/config/levels.ts`
- ❌ No "coming soon" levels
- ❌ No lock/unlock system

### Changes Needed
1. **Extend level config to 10 levels**
   - Add `isPlayable` boolean flag
   - Add `comingSoon` flag  
   - Levels 1-3: `isPlayable: true`
   - Levels 4-10: `isPlayable: false, comingSoon: true`

2. **Update MenuScreen**
   - Display all 10 level slots
   - Show locked icon for levels 4-10
   - Show "Coming Soon" message when tapped

3. **Update tests**
   - Verify 10 levels exist
   - Verify first 3 are playable
   - Verify 4-10 are locked

## Phase 2: Game Type System ✅

### Supported Types
1. **Runner** - Neon cyber theme, auto-scroll, dodge obstacles
2. **Platformer** - Jump-based navigation
3. **Puzzle** - Match/swap mechanics
4. **Word** - Letter-based tower game
5. **Card** - Pazaak-style card duel

### Directory Structure
```
game-template/app/game/
├── types/
│   ├── runner/
│   │   ├── RunnerEngine.tsx
│   │   ├── RunnerConfig.ts
│   │   └── RunnerUI.tsx
│   ├── platformer/
│   ├── puzzle/
│   ├── word/
│   └── card/
├── config/
│   └── gameTypes.ts  # Type definitions & configs
└── GameEngineFactory.tsx  # Selects engine by type
```

### Implementation
1. Create `gameTypes.ts` with type definitions
2. Implement each game type with:
   - Core mechanics
   - Visual style (colors, fonts, layout)
   - Level parameters
3. Update GameScreen to use GameEngineFactory

## Phase 3: Make Games Actually Playable ✅

### Runner Implementation
- Auto-scroll background
- Player sprite (tap to jump/dodge)
- Obstacles appearing from right
- Collision detection
- Score on obstacle pass/coin collect
- Lives decrease on collision
- Win: reach end or target score
- Lose: run out of lives

### Puzzle Implementation  
- Grid of tiles/gems
- Tap to select, swap adjacent
- Match 3+ in row/column
- Chain reactions
- Win: reach target score
- Lose: no more valid moves

### Word Implementation
- Grid of letter tiles
- Form words by connecting letters
- Longer words = more points
- Win: reach target score
- Timer based

### Card Implementation
- Simple Pazaak-style rules
- Player vs AI
- Build score to 20 (or closest without going over)
- Win: beat opponent
- Lose: bust or lower score

### Platformer Implementation
- 2D side-view
- Jump, move left/right
- Platforms, gaps, enemies
- Reach end of level
- Standard platformer physics

## Phase 4: AI Image Generation ✅

### Environment Setup
1. Add to `.env.template`:
   ```
   IMAGE_API_BASE_URL=https://api.openai.com/v1/images/generations
   IMAGE_API_KEY=your_key_here
   IMAGE_API_PROVIDER=openai  # or 'stability', 'replicate'
   ```

2. Create `agent/src/services/image.service.ts`
   - Support multiple providers (OpenAI DALL-E, Stability AI, etc.)
   - Generate splash screen (portrait 1080x1920)
   - Generate app icon (1024x1024)
   - Fallback to defaults on failure

### Integration Points

**Agent Side** (`agent/src/generators/game-generator.ts`):
1. After AI generates code
2. Before creating GitHub repo
3. Call image generation with prompt:
   - Game type + theme
   - Style keywords (neon, zen, minimal, etc.)
4. Save images to `assets/generated/` in game repo
5. Update `app.json` to reference generated splash

**Template Side** (`game-template/`):
1. Create `assets/generated/` folder
2. Add default fallback images
3. Update `app.json` splash configuration
4. Main menu can use generated background

### Prompt Templates
```typescript
// Runner - Neon theme
`A vibrant neon cyber city runner game splash screen, 
neon lights, futuristic, high contrast colors, 
portrait orientation, mobile game art style`

// Puzzle - Zen theme
`A calm minimalist puzzle game splash screen,
soft pastel colors, zen aesthetic, peaceful mountains,
portrait orientation, mobile game art style`

// Word - Tower theme
`A word tower puzzle game splash screen,
letters stacked vertically, clean typography,
portrait orientation, mobile game art style`

// Card - Space theme
`A space card game splash screen, sci-fi aesthetic,
card game elements, stars and planets background,
portrait orientation, mobile game art style`
```

## Phase 5: Visual Diversity ✅

### Per-Game-Type Styling

**Runner (Neon)**
- Colors: Bright cyan (#00ffff), magenta (#ff00ff), neon green (#39ff14)
- Fonts: Bold, tech-inspired
- Animations: Fast, sharp
- UI: Futuristic HUD

**Puzzle (Zen)**
- Colors: Soft pastels (#e8d5b7, #b8d4e3, #d4e8d4)
- Fonts: Clean, minimal
- Animations: Slow, smooth
- UI: Minimal, spacious

**Word (Clean)**
- Colors: Black/white with accent (#2c3e50, #ecf0f1, #3498db)
- Fonts: Clear sans-serif, large
- Animations: Letter-focused
- UI: Grid-based

**Card (Tabletop)**
- Colors: Green felt (#0e5e3a), wood brown (#8b4513), gold (#ffd700)
- Fonts: Serif for numbers
- Animations: Card flips, slides
- UI: Table layout

**Platformer (Adventure)**
- Colors: Nature tones (#87ceeb sky, #8b7355 brown, #90ee90 grass)
- Fonts: Playful, rounded
- Animations: Bouncy
- UI: Cartoon-style

### Implementation
1. Create `game-template/app/game/styles/` with theme files
2. Each game type loads its theme
3. Apply theme to:
   - Background colors
   - Button styles
   - Typography
   - Animation speeds
   - HUD layout

## Phase 6: Monetization Encapsulation ✅

### Create Unified API
```
game-template/app/monetization/
├── ads.ts         # AdMob wrapper
├── iap.ts         # IAP wrapper
└── config.ts      # Ad unit IDs, product SKUs
```

### Usage in Game
```typescript
import { showInterstitial } from '@/monetization/ads';
import { purchaseCoins } from '@/monetization/iap';

// After level complete
await showInterstitial();

// In shop
await purchaseCoins('coins_50');
```

## Phase 7: Agent Workflow Updates ✅

### CLI Changes
Update `agent/src/cli.ts` `generate-game` command:
```bash
npm run dev -- generate-game \
  --name "Neon Runner" \
  --type runner \
  --theme "neon cyber city" \
  --style "high-contrast neon colors"
```

### Game Generation Flow
1. Accept game type + theme
2. Select appropriate template logic
3. Generate AI images with theme-aware prompts
4. Copy template with selected game type
5. Configure levels (3 playable, 7 locked)
6. Update app.json with game name + generated assets
7. Run tests
8. Create GitHub repo
9. Push code

## Phase 8: Testing & Quality ✅

### Test Coverage
1. **Level System Tests**
   ```typescript
   - 10 levels defined
   - Levels 1-3 playable
   - Levels 4-10 locked
   - Unlock progression works
   ```

2. **Game Type Tests**
   ```typescript
   - Each game type loads correctly
   - Game mechanics work (collision, scoring, etc.)
   - Win/lose conditions trigger
   ```

3. **Image Generation Tests**
   ```typescript
   - Image service calls API correctly
   - Falls back to default on failure
   - Saves images to correct path
   ```

4. **Integration Tests**
   ```typescript
   - Full game generation workflow
   - Generated game builds successfully
   - Tests pass in generated games
   ```

### TypeScript Compliance
- Fix all `any` types
- Add strict null checks
- Proper interface definitions

### Documentation Updates
- README: Add AI image generation info
- SETUP.md: Add IMAGE_API_* env vars
- WORKFLOWS.md: Add game type selection examples
- ai-overview.md: Document new architecture

## Implementation Order

1. ✅ **Level System** (1-2 hours)
   - Extend to 10 levels
   - Add lock/unlock logic
   - Update UI

2. ✅ **Game Type Framework** (2-3 hours)
   - Create type system
   - GameEngineFactory
   - Base interfaces

3. ✅ **Implement Runner** (2-3 hours)
   - Full playable mechanics
   - Visual style
   - Test

4. ✅ **Implement Puzzle** (2 hours)
   - Match-3 mechanics
   - Zen styling

5. ✅ **Implement Word, Card, Platformer** (3-4 hours)
   - One by one
   - Test each

6. ✅ **AI Image Service** (1-2 hours)
   - API integration
   - Prompt templates
   - Fallback logic

7. ✅ **Monetization Refactor** (1 hour)
   - Encapsulate ads/IAP
   - Clean API

8. ✅ **Agent Updates** (2 hours)
   - CLI changes
   - Image generation workflow
   - Template selection

9. ✅ **Testing & Polish** (2-3 hours)
   - Write comprehensive tests
   - Fix TypeScript issues
   - Update docs

## Success Criteria

- [ ] Generate a runner game → fully playable, neon style, AI splash
- [ ] Generate a puzzle game → fully playable, zen style, AI splash  
- [ ] Generate a word game → fully playable, clean style, AI splash
- [ ] Generate a card game → fully playable, tabletop style, AI splash
- [ ] Generate a platformer → fully playable, adventure style, AI splash
- [ ] All games show 10 levels (3 playable, 7 locked)
- [ ] Each game looks visually distinct
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No secrets in code

## Estimated Total Time: 15-20 hours

Let's begin implementation!
