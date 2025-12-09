# AI Mobile Game Generator - Architecture Overview

## Project Purpose
Automate the creation, deployment, and management of multiple mobile games to discover market winners through rapid experimentation.

## High-Level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent Orchestrator                    │
│  (Node.js/TypeScript - Brain of the operation)              │
│  - Game generation logic                                     │
│  - Workflow orchestration                                    │
│  - Error handling & self-healing                            │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐  ┌─────▼──────┐  ┌──────────┐  ┌─────────────┐
│   GitHub    │  │   Google   │  │   Expo   │  │  AI Model   │
│     API     │  │  Play API  │  │  EAS CLI │  │  (Claude)   │
└──────┬──────┘  └─────┬──────┘  └────┬─────┘  └──────┬──────┘
       │               │              │               │
       │               │              │               │
┌──────▼────────────────▼──────────────▼───────────────▼──────┐
│              Generated Game Repositories                     │
│  game-01-runner, game-02-platformer, ... game-10-puzzle     │
│  Each with: Code, Tests, CI/CD, Monetization                │
└──────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Agent Service
- **Language**: TypeScript/Node.js
- **Key Libraries**:
  - `@octokit/rest` - GitHub API client
  - `googleapis` - Google Play Developer API
  - `@anthropic-ai/sdk` - Claude API for code generation
  - `commander` - CLI interface
  - `dotenv` - Environment configuration

### Game Template
- **Framework**: Expo (React Native)
- **Testing**: Jest + Detox (E2E)
- **State Management**: React Context or Zustand
- **Monetization**:
  - AdMob: `react-native-google-mobile-ads`
  - IAP: `react-native-iap` or Expo's RevenueCat integration

### CI/CD
- **Platform**: GitHub Actions
- **Build System**: EAS (Expo Application Services)
- **Test Runner**: Jest + Detox
- **Deployment**: Google Play (via EAS submit)

## Directory Structure

```
/workspace
├── agent/                      # AI Agent Orchestrator
│   ├── src/
│   │   ├── cli.ts             # Command-line interface
│   │   ├── orchestrator.ts    # Main workflow orchestration
│   │   ├── services/
│   │   │   ├── github.service.ts      # GitHub repo management
│   │   │   ├── googleplay.service.ts  # Play Store API
│   │   │   ├── eas.service.ts         # EAS build/submit
│   │   │   ├── ai.service.ts          # AI code generation
│   │   │   └── analytics.service.ts   # Game performance tracking
│   │   ├── generators/
│   │   │   ├── game-generator.ts      # Core game generation logic
│   │   │   ├── test-generator.ts      # Test suite generation
│   │   │   └── level-generator.ts     # Level design generation
│   │   ├── templates/
│   │   │   ├── prompts/               # AI prompts for game generation
│   │   │   └── configs/               # Config templates
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── game-template/              # Base Expo game template
│   ├── app/
│   │   ├── screens/
│   │   │   ├── MenuScreen.tsx
│   │   │   ├── GameScreen.tsx
│   │   │   └── GameOverScreen.tsx
│   │   ├── components/
│   │   │   ├── GameEngine/
│   │   │   ├── AdBanner.tsx
│   │   │   └── PurchaseButton.tsx
│   │   ├── config/
│   │   │   └── levels.ts
│   │   ├── hooks/
│   │   │   ├── useGameState.ts
│   │   │   ├── useAds.ts
│   │   │   └── useIAP.ts
│   │   └── utils/
│   ├── __tests__/
│   ├── .github/
│   │   └── workflows/
│   │       └── ci.yml
│   ├── app.json
│   ├── eas.json
│   └── package.json
├── generated-games/            # Output folder for generated games
│   ├── game-01-runner/
│   ├── game-02-platformer/
│   └── ...
├── docs/                       # Documentation
│   ├── SETUP.md
│   ├── WORKFLOWS.md
│   └── TROUBLESHOOTING.md
├── .env.template              # Environment variables template
└── README.md
```

## Core Workflows

### Workflow 1: Generate New Game

```typescript
// Command: npm run agent -- generate-game --type runner --name "Space Runner"

1. AI generates game concept (theme, mechanics, assets description)
2. Create GitHub repository (game-01-space-runner)
3. Clone game-template to local workspace
4. AI modifies code:
   - Update game mechanics (physics, controls)
   - Generate 3 level configurations
   - Customize UI theme/colors
   - Update app.json (name, bundle ID)
5. Generate test suite
6. Commit & push to GitHub
7. Trigger CI pipeline
8. Monitor build status
9. If tests fail:
   - Feed error logs to AI
   - Generate fixes
   - Retry (max 3 attempts)
10. Once tests pass:
    - Trigger EAS build (Android AAB)
    - Store build URL in database
```

### Workflow 2: Deploy to Google Play

```typescript
// Command: npm run agent -- deploy-game --game game-01-space-runner

1. Check if EAS build exists & is successful
2. If not, trigger build workflow
3. Prepare Google Play listing:
   - Use template + AI-generated descriptions
   - Reference pre-created assets (icons, screenshots)
4. Submit via EAS submit:
   - eas submit --platform android --latest
5. Update internal tracking (game status -> "in_review")
6. Monitor Play Console for approval
```

### Workflow 3: Analyze & Select Winner

```typescript
// Command: npm run agent -- analyze-performance --days 30

1. Fetch metrics for all 10 games via Google Play API:
   - Install count
   - Retention (1-day, 7-day)
   - ARPDAU (if revenue tracking available)
   - Crash rate
2. Rank games by weighted score
3. Identify winner
4. Generate report (markdown + JSON)
5. Optionally: auto-trigger "extend winner" workflow
```

### Workflow 4: Extend Winner Game

```typescript
// Command: npm run agent -- extend-game --game game-05-puzzle --levels 10

1. Clone winner game repo
2. Analyze existing level structure
3. AI generates 10 new levels:
   - Progressive difficulty
   - New mechanics/enemies
   - Unique challenges
4. Update level config
5. Generate additional tests
6. Create PR (not auto-merge)
7. Run CI
8. Notify for review
```

### Workflow 5: Sunset Underperforming Games

```typescript
// Command: npm run agent -- sunset-games --exclude game-05-puzzle

1. Archive GitHub repos (mark as archived)
2. Optionally unpublish from Google Play (requires manual confirmation)
3. Update tracking database
4. Generate sunset report
```

## Security & Secrets Management

### Required Secrets
- `GITHUB_TOKEN` - Personal access token with repo permissions
- `EXPO_TOKEN` - EAS authentication
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` - Play Developer API credentials
- `ADMOB_APP_ID` - AdMob application ID (per game)
- `ADMOB_BANNER_ID` - AdMob ad unit IDs
- `ANTHROPIC_API_KEY` - Claude API key

### Storage Strategy
- **Development**: `.env` file (gitignored)
- **CI/CD**: GitHub Secrets (per repo)
- **Agent Service**: Environment variables or secure vault (HashiCorp Vault)

### Generated Games
Each generated game references secrets via environment variables:
```typescript
const ADMOB_BANNER_ID = process.env.ADMOB_BANNER_ID || Constants.expoConfig?.extra?.admobBannerId;
```

## AI Code Generation Strategy

### Base Prompt Structure
```
System: You are an expert React Native game developer using Expo.

Context:
- Framework: Expo SDK 50+
- Target: Android only
- Monetization: AdMob + IAP
- Architecture: Functional components + hooks

Task: Generate a {GAME_TYPE} game with these requirements:
- Theme: {THEME}
- Mechanics: {MECHANICS}
- 3 levels with progressive difficulty
- Lives system (5 lives, can purchase more)
- Coin collection (rewarded after each level)
- AdMob banner on menu, interstitial between levels

Code requirements:
- TypeScript
- Follow existing project structure in game-template/
- Reuse existing components where possible
- Include inline comments
- Handle edge cases (app state, interruptions)

Output:
- Modified files with full code
- levels.ts configuration
- Test cases
```

### Self-Healing Logic
When builds/tests fail:
```
System: The previous build failed with these errors:

{ERROR_LOGS}

File structure:
{RELEVANT_FILES}

Your task: Analyze the error and provide ONLY the necessary fixes.
- Identify root cause
- Provide exact file changes (old code -> new code)
- Explain the fix briefly

Output format:
File: {filepath}
Change: {old_code} -> {new_code}
Reason: {explanation}
```

## Game Template Architecture

### Level Configuration
```typescript
// config/levels.ts
export interface Level {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  targetScore: number;
  obstacles: ObstacleConfig[];
  powerUps: PowerUpConfig[];
  background: string;
  music: string;
}

export const LEVELS: Level[] = [
  { id: 1, name: "Starter", difficulty: "easy", ... },
  { id: 2, name: "Challenge", difficulty: "medium", ... },
  { id: 3, name: "Expert", difficulty: "hard", ... },
];
```

### Game State Management
```typescript
// hooks/useGameState.ts
interface GameState {
  currentLevel: number;
  lives: number;
  coins: number;
  score: number;
  isPaused: boolean;
  isGameOver: boolean;
}

export const useGameState = () => {
  const [state, setState] = useState<GameState>({
    currentLevel: 1,
    lives: 5,
    coins: 0,
    score: 0,
    isPaused: false,
    isGameOver: false,
  });
  
  // Methods: startLevel, endLevel, loseLife, addCoins, etc.
};
```

### Monetization Integration

#### AdMob
```typescript
// components/AdBanner.tsx
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

export const AdBanner = () => {
  const adUnitId = Constants.expoConfig?.extra?.admobBannerId;
  
  return (
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
};
```

#### IAP
```typescript
// hooks/useIAP.ts
import { useIAP, purchaseErrorListener, purchaseUpdatedListener } from 'react-native-iap';

export const useInAppPurchase = () => {
  const { products, getProducts, requestPurchase } = useIAP();
  
  const buyCoins = async (sku: string) => {
    try {
      await requestPurchase({ sku });
    } catch (err) {
      console.error('Purchase failed', err);
    }
  };
  
  return { products, buyCoins };
};
```

## CI/CD Pipeline Details

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm install
      - run: eas build --platform android --profile production --non-interactive
        env:
          EAS_PROJECT_ID: ${{ secrets.EAS_PROJECT_ID }}

  submit:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas submit --platform android --latest --non-interactive
        env:
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}
```

## Testing Strategy

### Unit Tests (Jest)
```typescript
// __tests__/game-logic.test.ts
describe('Game Logic', () => {
  it('should lose life when player collides with obstacle', () => {
    const state = { lives: 5 };
    const result = handleCollision(state, 'obstacle');
    expect(result.lives).toBe(4);
  });
  
  it('should add coins when collecting coin item', () => {
    const state = { coins: 10 };
    const result = handleCollision(state, 'coin');
    expect(result.coins).toBe(11);
  });
});
```

### E2E Tests (Detox)
```typescript
// e2e/game-flow.test.ts
describe('Game Flow', () => {
  it('should complete level 1 successfully', async () => {
    await element(by.id('start-button')).tap();
    await element(by.id('level-1-button')).tap();
    // Simulate gameplay
    await expect(element(by.id('level-complete'))).toBeVisible();
  });
});
```

## Performance Metrics & Analytics

### Tracking Per Game
- Install count (Google Play API)
- Daily Active Users (DAU)
- Retention rates (1-day, 7-day, 30-day)
- Average session length
- Revenue per user (ARPU)
- Ad impressions & eCPM
- IAP conversion rate
- Crash-free rate

### Winner Selection Algorithm
```typescript
const scoreGame = (metrics: GameMetrics): number => {
  return (
    metrics.installs * 0.3 +
    metrics.retention7Day * 1000 * 0.4 +
    metrics.arpdau * 10000 * 0.2 +
    (1 - metrics.crashRate) * 100 * 0.1
  );
};
```

## Constraints & Limitations

### What the Agent CAN'T Automate
1. **Initial Google Play Setup**
   - Developer account creation ($25 fee)
   - First-time app submission forms
   - Content rating questionnaire
   - Privacy policy (can generate template, but needs review)

2. **Policy Compliance**
   - Reviewing rejections
   - Adjusting content for policy violations
   - Handling copyright/trademark issues

3. **Creative Assets**
   - Icon design (can generate placeholder, needs designer)
   - Screenshots (can automate captures, may need touch-up)
   - Promotional graphics

4. **Marketing Execution**
   - Creating ad campaigns
   - Writing ad copy (can assist)
   - Budget management

### Workarounds
- **Listings**: Use templates + AI-generated descriptions, manual first submission
- **Assets**: Use asset generation APIs (DALL-E, Midjourney) or template graphics
- **Marketing**: Agent generates campaign proposals, human executes

## Development Phases

### Phase 1: Foundation (Week 1-2)
- ✓ Set up agent service structure
- ✓ Create game template
- ✓ Implement GitHub API integration
- ✓ Basic CI/CD pipeline

### Phase 2: AI Integration (Week 3-4)
- ✓ AI code generation service
- ✓ Prompt engineering for game generation
- ✓ Self-healing error correction

### Phase 3: Build & Deploy (Week 5-6)
- ✓ EAS CLI integration
- ✓ Google Play API setup
- ✓ Automated submission workflow

### Phase 4: Monetization (Week 7-8)
- ✓ AdMob integration in template
- ✓ IAP setup and testing
- ✓ Revenue tracking

### Phase 5: Analytics & Winner Selection (Week 9-10)
- ✓ Performance metrics collection
- ✓ Winner selection algorithm
- ✓ Extension workflow (add 10 levels)

### Phase 6: Testing & Refinement (Week 11-12)
- ✓ Generate 3-5 test games
- ✓ Deploy to Google Play (internal testing)
- ✓ Validate full workflow
- ✓ Fix edge cases

## Best Practices & Conventions

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Functional components with hooks
- Descriptive variable names
- Inline comments for complex logic

### Git Conventions
- Conventional Commits (feat:, fix:, chore:, etc.)
- PR required for level extensions
- Auto-merge only for passing tests

### Error Handling
- Try-catch with specific error messages
- Retry logic (3 attempts max)
- Fallback to manual intervention after retries
- Comprehensive logging

### Security
- Never commit secrets
- Use environment variables
- Scope API tokens minimally
- Regular secret rotation

## Future Enhancements

### v2.0 Features
- iOS support (App Store submission)
- Multiplayer game generation
- More game types (puzzle, strategy, casual)
- A/B testing of game variants
- Dynamic difficulty adjustment
- Backend integration (leaderboards, cloud save)

### Advanced AI Features
- Visual asset generation (DALL-E integration)
- Music generation
- Localization (auto-translate to 10 languages)
- Play Store optimization (ASO keywords)

## Dependencies & Requirements

### System Requirements
- Node.js 18+
- npm or yarn
- Git
- Android SDK (for Detox E2E tests)
- 10GB disk space (for generated games)

### API Access Required
- Anthropic API (Claude)
- GitHub API
- Google Play Developer API
- Expo/EAS account
- AdMob account

### Estimated Costs
- Anthropic API: ~$50-100/month (for 10 games)
- EAS builds: ~$29/month (Expo subscription)
- Google Play Developer: $25 one-time
- GitHub: Free (public repos) or $4/month (private)
- **Total**: ~$100-150/month + $25 setup

## Conclusion

This architecture provides a realistic, production-ready approach to automating mobile game generation and deployment. The AI agent handles the repetitive engineering work, while humans make strategic decisions (which game to extend, marketing strategy, policy compliance).

**Key Success Factor**: Start with 1-2 games manually to validate the template and workflows, then let the agent scale to 10.
