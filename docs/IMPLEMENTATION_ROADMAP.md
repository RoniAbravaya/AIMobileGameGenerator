# Implementation Roadmap: Hybrid Dynamic Game Generator

**Start Date**: December 9, 2025  
**Approach**: Hybrid (Always generate, templates as fallback)  
**Quality Bar**: Polished (Code + Gameplay + Visual) - Match current templates  
**Automation**: 100% automated (no manual curation)  
**Timeline**: 5-7 weeks  
**Success Metric**: 80%+ games pass quality gates without manual intervention

---

## 🎯 Requirements Confirmed

### Quality Definition
- ✅ **Code Quality**: Clean TypeScript, no errors, well-structured
- ✅ **Gameplay Quality**: Fun, engaging, clear objectives, balanced
- ✅ **Visual Quality**: Smooth animations, beautiful UI, professional assets

### Validation Approach
- ✅ **Strict Validation Gates**: Must pass all checks to accept
- ✅ **Automated Gameplay Testing**: Simulate 100 taps, verify stability
- ✅ **Visual Validation**: Screenshot analysis, contrast checking
- ✅ **Code Quality Focus**: TypeScript, ESLint, tests, structure

### Generation Strategy
- ✅ **Always Generate First**: Try to create new mechanics
- ✅ **Max 5 Retry Attempts**: Regenerate with improvements
- ✅ **Template Fallback**: Use closest template if all attempts fail
- ✅ **Budget**: $2-5 per game (including retries)

### Quality Target
- ✅ **Match Current Templates**: Generated games as polished as Runner/Puzzle/etc.
- ✅ **80%+ Success Rate**: Most games pass without fallback
- ✅ **Fully Automated**: No manual intervention required

---

## 📅 Implementation Phases

### Phase 1: Quality Validation Framework (Week 1)
**Goal**: Build automated quality measurement system

#### Day 1-2: Foundation
- [ ] Create `agent/src/validators/qualityValidator.ts`
- [ ] Define quality scoring interfaces (0-100 for each dimension)
- [ ] Implement code quality metrics:
  - TypeScript compilation check
  - ESLint validation
  - Test execution
  - Code structure analysis
- [ ] Create baseline: Test against existing 5 templates

#### Day 3-4: Gameplay Testing
- [ ] Create `agent/src/testing/gameplayTester.ts`
- [ ] Implement automated input simulation:
  - Generate random tap/swipe/drag inputs
  - Execute 100 actions per game
  - Monitor for crashes/freezes
- [ ] Verify win/lose conditions:
  - Check if win is reachable within time limit
  - Check if lose can be triggered
  - Validate score increases

#### Day 5-7: Visual Validation
- [ ] Create `agent/src/validators/visualValidator.ts`
- [ ] Implement visual checks:
  - Color contrast validation (WCAG AA)
  - Layout overflow detection
  - Image loading validation
  - Animation smoothness check
- [ ] Screenshot comparison system
- [ ] Theme consistency scoring

#### Deliverables:
- ✅ Quality scoring system (code + gameplay + visual)
- ✅ Automated test harness
- ✅ Baseline scores for 5 existing templates
- ✅ Validation pipeline working

---

### Phase 2: GameSpec Model & LLM Prompts (Week 2)
**Goal**: Build the game design system

#### Day 1-2: GameSpec Model
- [ ] Create `agent/src/models/GameSpec.ts` with full interface:
  - id, name, highConcept, tags
  - mechanics (genre, camera, controls, entities, etc.)
  - visualTheme (mood, palette, UI style)
  - levels (10 levels with parameters)
- [ ] Create `agent/src/validators/gameSpecValidator.ts`
- [ ] Implement runtime validation with detailed error messages
- [ ] Create example GameSpecs (5-10 diverse examples)

#### Day 3-4: Game Design Prompt
- [ ] Create `agent/src/prompts/gameSpecPrompt.ts`
- [ ] Write comprehensive LLM prompt:
  - System instructions (2D mobile, simple controls)
  - Constraints (no 3D, no licensed IP)
  - GameSpec schema
  - Anti-repetition logic (compare to previous games)
  - Examples of good GameSpecs
- [ ] Implement prompt builder function
- [ ] Add user hints support (tone, difficulty, style)

#### Day 5-6: GameSpec Generation Service
- [ ] Add `generateGameSpec()` to `ai.service.ts`
- [ ] Implement retry logic with refinement
- [ ] Add novelty checking (compare to previous games)
- [ ] Load/save GameSpec database

#### Day 7: Testing
- [ ] Test GameSpec generation with various hints
- [ ] Generate 10 diverse GameSpecs
- [ ] Validate structure and implementability
- [ ] Measure novelty scores

#### Deliverables:
- ✅ GameSpec model + validation
- ✅ LLM prompt for game design
- ✅ GameSpec generation service
- ✅ 10 example GameSpecs
- ✅ Database of generated specs

---

### Phase 3: Generic Game Runtime (Week 3)
**Goal**: Build reusable game infrastructure

#### Day 1-2: Core Runtime
- [ ] Create `game-template/app/game/runtime/GameRuntime.tsx`
- [ ] Implement generic game loop:
  - Update tick (60 FPS)
  - Render cycle
  - State management
  - Pause/resume
- [ ] Add lifecycle hooks (onStart, onUpdate, onEnd)

#### Day 3-4: Physics & Math Helpers
- [ ] Create `game-template/app/game/runtime/physics2d.ts`:
  - Vector2D class
  - AABB collision detection
  - Circle collision detection
  - Velocity/acceleration helpers
  - Simple gravity simulation
- [ ] Create `game-template/app/game/runtime/math2d.ts`:
  - Distance calculations
  - Angle/rotation helpers
  - Random utilities
  - Interpolation functions

#### Day 5-6: Input System
- [ ] Create `game-template/app/game/runtime/input.ts`:
  - Tap handler
  - Double tap detection
  - Long press detection
  - Drag/swipe gestures
  - Virtual button support
- [ ] Event bus for input events

#### Day 7: Rendering Helpers
- [ ] Create `game-template/app/game/runtime/rendering.ts`:
  - Simple sprite rendering
  - Shape primitives (rect, circle, line)
  - Text rendering helpers
  - Layer system (background, game, UI)
- [ ] Performance optimizations

#### Deliverables:
- ✅ Generic game runtime shell
- ✅ Physics & collision helpers
- ✅ Input handling system
- ✅ Rendering utilities
- ✅ Performance monitoring

---

### Phase 4: Mechanics Code Generator (Week 4)
**Goal**: Generate mechanics code from GameSpec

#### Day 1-2: Code Generation Prompt
- [ ] Create `agent/src/prompts/mechanicsPrompt.ts`
- [ ] Write LLM prompt for code generation:
  - Input: GameSpec.mechanics
  - Output: TypeScript code (gameLogic, entities, controls)
  - Constraints: Use runtime helpers, simple 2D only
  - Examples: Show 3-4 complete examples
- [ ] Prompt includes code quality requirements

#### Day 3-5: Mechanics Generator
- [ ] Create `agent/src/generators/mechanicsGenerator.ts`
- [ ] Implement `generateFromGameSpec()`:
  - Parse GameSpec.mechanics
  - Build LLM prompt
  - Generate code files
  - Validate TypeScript compilation
  - Fix common errors
- [ ] Implement retry logic with error feedback
- [ ] Template code patterns for common mechanics

#### Day 6-7: Integration & Testing
- [ ] Create `game-template/app/game/generated/` folder
- [ ] Update `GameScreen` to load generated code
- [ ] Test with 5 diverse GameSpecs
- [ ] Measure success rate
- [ ] Refine prompts based on failures

#### Deliverables:
- ✅ Mechanics generation prompt
- ✅ Code generator service
- ✅ Integration with game runtime
- ✅ 5 working generated games
- ✅ Success rate > 60%

---

### Phase 5: Theme System (Week 5)
**Goal**: Dynamic visual theming

#### Day 1-2: Theme Model
- [ ] Create `game-template/app/theme/theme.ts`:
  - Colors (primary, secondary, accent, background, etc.)
  - Typography (fonts, sizes)
  - Layout (spacing, radii, shadows)
  - Animation (speed, easing)
- [ ] Create `game-template/app/theme/ThemeProvider.tsx`
- [ ] React context for theme access

#### Day 3-4: Theme Generator
- [ ] Create `agent/src/generators/themeGenerator.ts`
- [ ] Implement `createThemeFromVisualTheme()`:
  - Parse GameSpec.visualTheme
  - Generate color scheme (with harmonies)
  - Map font hints to actual fonts
  - Derive spacing/shadows from UI style
  - Create animation presets
- [ ] Validate color contrast (WCAG AA)

#### Day 5-6: UI Refactoring
- [ ] Refactor all UI components to use ThemeProvider:
  - MenuScreen
  - LevelSelectScreen
  - GameScreen
  - ShopScreen
  - Buttons, cards, text styles
- [ ] Remove all hardcoded colors/styles

#### Day 7: Testing
- [ ] Generate themes for 10 diverse visualThemes
- [ ] Verify visual consistency
- [ ] Test contrast and accessibility
- [ ] Measure visual quality scores

#### Deliverables:
- ✅ Theme system + provider
- ✅ Theme generator
- ✅ All UI uses themes
- ✅ 10 unique visual styles
- ✅ Accessibility compliance

---

### Phase 6: Enhanced Navigation & Assets (Week 6)
**Goal**: Complete user experience

#### Day 1-2: Navigation Flow
- [ ] Create `game-template/app/screens/SplashScreen.tsx`:
  - Show AI-generated splash image
  - Preload assets (fonts, images, audio)
  - Progress indicator
  - Auto-navigate to menu after 2-3 seconds
- [ ] Create `game-template/app/screens/LevelSelectScreen.tsx`:
  - Grid of 10 level slots
  - Visual distinction: playable vs locked
  - Progress indicators
  - Theme-aware styling
- [ ] Create `game-template/app/screens/ResultScreen.tsx`:
  - Win/lose display
  - Score summary
  - Continue/retry/menu buttons

#### Day 3-4: Enhanced Image Generation
- [ ] Update `agent/src/services/image.service.ts`:
  - Add `generateMenuBackground(spec)`
  - Add `generateSceneBackground(spec)`
  - Add `generateLevelThumbnails(spec)` (optional)
- [ ] Implement GameSpec-aware prompts:
  - Incorporate mechanics.coreLoop
  - Use visualTheme.mood
  - Include color palette
  - Match UI style
- [ ] Retry logic + fallbacks

#### Day 5-6: Level Generator
- [ ] Create `agent/src/generators/levelGenerator.ts`
- [ ] Implement `generateLevelConfig()`:
  - Parse GameSpec.levels
  - Generate TypeScript config file
  - Add isPlayable flags (1-3 true, 4-10 false)
  - Include level-specific parameters
- [ ] Generate `app/config/levels.generated.ts`

#### Day 7: Integration
- [ ] Update `app/index.tsx` with full navigation:
  - Splash → Menu → LevelSelect → Game → Result → Menu
- [ ] Wire all generated assets
- [ ] Test complete flow

#### Deliverables:
- ✅ Splash screen with preloading
- ✅ Level select screen
- ✅ Result screen
- ✅ 3 generated images per game
- ✅ Level config generator
- ✅ Complete navigation flow

---

### Phase 7: Retry & Fallback Logic (Week 7)
**Goal**: Achieve high success rate

#### Day 1-2: Retry System
- [ ] Create `agent/src/generators/retryManager.ts`
- [ ] Implement smart retry logic:
  - Attempt 1: Standard prompts
  - Attempt 2: Include previous errors
  - Attempt 3: Simplify mechanics
  - Attempt 4: More explicit constraints
  - Attempt 5: Use template hints
- [ ] Track retry reasons and success rates

#### Day 3-4: Template Fallback
- [ ] Create `agent/src/generators/templateMatcher.ts`
- [ ] Implement similarity scoring:
  - Compare GameSpec to 5 templates
  - Find closest match
  - Adapt template to GameSpec (theme, levels)
- [ ] Seamless fallback when generation fails

#### Day 5-6: Quality Refinement
- [ ] Analyze failure patterns
- [ ] Improve prompts based on data
- [ ] Add common error fixes
- [ ] Tune validation thresholds

#### Day 7: Testing
- [ ] Generate 20 games
- [ ] Measure success rate
- [ ] Measure fallback rate
- [ ] Verify quality scores

#### Deliverables:
- ✅ Smart retry system
- ✅ Template fallback mechanism
- ✅ Success rate > 70%
- ✅ Quality analysis report

---

### Phase 8: End-to-End Integration (Week 8)
**Goal**: Complete automated workflow

#### Day 1-2: Workflow Orchestration
- [ ] Update `agent/src/orchestrator.ts`:
  - Load previous GameSpecs
  - Generate new GameSpec
  - Generate theme
  - Generate mechanics code
  - Generate level config
  - Generate images
  - Run validation
  - Retry if needed
  - Fall back to template if needed
  - Create repo
  - Push to GitHub

#### Day 3-4: CLI Updates
- [ ] Update `agent/src/cli.ts`:
  - Remove `--type` requirement
  - Add `--tone`, `--style`, `--difficulty` hints
  - Add `--skip-validation` for testing
  - Add `--verbose` for debugging
- [ ] Better error messages
- [ ] Progress indicators

#### Day 5-6: Batch Generation
- [ ] Implement `generate-batch` command
- [ ] Generate multiple games in parallel
- [ ] Quality report generation
- [ ] Failed game logging

#### Day 7: Documentation
- [ ] Update README with new workflow
- [ ] Update docs/SETUP.md
- [ ] Create docs/GAMESPEC_GUIDE.md
- [ ] Update docs/WORKFLOWS.md

#### Deliverables:
- ✅ Complete workflow
- ✅ Updated CLI
- ✅ Batch generation
- ✅ Complete documentation

---

### Phase 9: Final Testing & Tuning (Week 9)
**Goal**: Achieve 80%+ success rate

#### Day 1-3: Large-Scale Testing
- [ ] Generate 50 games with diverse hints
- [ ] Measure quality scores for all
- [ ] Analyze failure cases
- [ ] Identify patterns

#### Day 4-5: Prompt Optimization
- [ ] Refine GameSpec prompt based on failures
- [ ] Refine mechanics prompt based on errors
- [ ] Add more examples to prompts
- [ ] Improve error recovery

#### Day 6-7: Final Polish
- [ ] Fix edge cases
- [ ] Optimize performance
- [ ] Final documentation pass
- [ ] Create example gallery

#### Deliverables:
- ✅ 50 test games generated
- ✅ Success rate 80%+
- ✅ Quality report
- ✅ Final documentation

---

## 📊 Success Metrics

### Code Quality (Target: 90+/100)
- TypeScript compiles: 100%
- ESLint passes: 100%
- Tests pass: 100%
- Code structure: 80%+

### Gameplay Quality (Target: 85+/100)
- No crashes (100 inputs): 100%
- Win condition reachable: 90%+
- Lose condition works: 90%+
- Score system works: 90%+
- Controls responsive: 85%+

### Visual Quality (Target: 85+/100)
- Color contrast: 100% (WCAG AA)
- Images load: 100%
- No layout issues: 90%+
- Animations smooth: 85%+
- Theme consistency: 90%+

### Overall Success
- **Generation success rate**: 80%+
- **Fallback rate**: <20%
- **Manual intervention**: 0%
- **Cost per game**: $2-5
- **Time per game**: 10-20 minutes

---

## 🔧 Technology Stack

### New Dependencies
```json
{
  "dependencies": {
    "zod": "^3.22.4",              // GameSpec validation
    "color": "^4.2.3",              // Color manipulation
    "canvas": "^2.11.2",            // Screenshot testing
    "puppeteer": "^21.6.0"          // Visual validation
  }
}
```

### New Tools
- **Zod**: Runtime type validation for GameSpec
- **Color**: Generate harmonious color schemes
- **Canvas**: Visual testing and validation
- **Puppeteer**: Automated gameplay testing

---

## 📁 New File Structure

```
agent/
├── src/
│   ├── models/
│   │   └── GameSpec.ts                 ✨ NEW
│   ├── prompts/
│   │   ├── gameSpecPrompt.ts           ✨ NEW
│   │   └── mechanicsPrompt.ts          ✨ NEW
│   ├── validators/
│   │   ├── gameSpecValidator.ts        ✨ NEW
│   │   ├── qualityValidator.ts         ✨ NEW
│   │   └── visualValidator.ts          ✨ NEW
│   ├── generators/
│   │   ├── mechanicsGenerator.ts       ✨ NEW
│   │   ├── themeGenerator.ts           ✨ NEW
│   │   ├── levelGenerator.ts           ✨ NEW
│   │   ├── retryManager.ts             ✨ NEW
│   │   └── templateMatcher.ts          ✨ NEW
│   ├── testing/
│   │   └── gameplayTester.ts           ✨ NEW
│   └── ...

game-template/
├── app/
│   ├── theme/
│   │   ├── theme.ts                    ✨ NEW
│   │   ├── ThemeProvider.tsx           ✨ NEW
│   │   └── generatedTheme.ts           ✨ GENERATED
│   ├── game/
│   │   ├── runtime/                    ✨ NEW
│   │   │   ├── GameRuntime.tsx
│   │   │   ├── physics2d.ts
│   │   │   ├── input.ts
│   │   │   └── rendering.ts
│   │   └── generated/                  ✨ GENERATED
│   │       ├── gameLogic.ts
│   │       ├── entities.ts
│   │       └── controls.ts
│   ├── screens/
│   │   ├── SplashScreen.tsx            ✨ NEW
│   │   ├── LevelSelectScreen.tsx       ✨ NEW
│   │   └── ResultScreen.tsx            ✨ NEW
│   └── config/
│       └── levels.generated.ts         ✨ GENERATED
├── assets/
│   └── generated/
│       ├── splash.png
│       ├── menu-bg.png                 ✨ NEW
│       └── scene-bg.png                ✨ NEW
└── game-spec.json                      ✨ NEW
```

---

## 🎯 Current Status: READY TO START

**Next Action**: Begin Phase 1, Day 1 - Quality Validation Framework

I will now start implementing the foundation. Progress will be tracked in this document.

---

**Last Updated**: December 9, 2025  
**Status**: Implementation starting  
**Estimated Completion**: 7-9 weeks
