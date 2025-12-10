# AI Mobile Game Generator

An automated system for generating, deploying, and managing multiple mobile games to discover market winners through rapid experimentation.

## 🎯 Overview

This project enables you to:

1. **Generate** 10 different level-based mobile games using AI
2. **Deploy** them automatically to Google Play
3. **Analyze** performance metrics to identify winners
4. **Extend** the winning game with additional content
5. **Sunset** underperforming games

All orchestrated by an AI agent that handles code generation, testing, deployment, and analysis.

## ✨ Features

- 🤖 **AI-Powered Code Generation** - Claude generates complete game code
- 📦 **Automated GitHub Integration** - Creates repos, commits, and manages CI/CD
- 🚀 **EAS Build & Deploy** - Builds Android APKs/AABs and submits to Play Store
- 💰 **Built-in Monetization** - AdMob ads and in-app purchases included
- 📊 **Performance Analytics** - Tracks installs, retention, revenue
- 🎮 **10 Game Types** - Runner, platformer, puzzle, match-3, and more
- ✅ **Automated Testing** - Jest tests with AI-powered self-healing
- 🔄 **Winner Extension** - Automatically adds levels to top performers

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AI Agent Orchestrator                       │
│  (TypeScript service that coordinates everything)            │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐  ┌─────▼──────┐  ┌──────────┐  ┌─────────────┐
│   GitHub    │  │   Google   │  │   Expo   │  │   Claude    │
│     API     │  │  Play API  │  │  EAS CLI │  │     API     │
└──────┬──────┘  └─────┬──────┘  └────┬─────┘  └──────┬──────┘
       │               │              │               │
       └───────────────┴──────────────┴───────────────┘
                       │
              Generated Games (1-10)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- GitHub account
- Expo account
- Google Play Developer account
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone <your-repo>
cd workspace

# Install dependencies
cd agent
npm install

# Configure environment
cp ../.env.template ../.env
# Edit .env with your credentials

# Verify setup
npm run dev -- init
```

### Generate Your First Game

```bash
# Interactive mode (recommended)
npm run dev -- generate-game --interactive

# Or specify parameters directly
npm run dev -- generate-game \
  --name "Neon Runner" \
  --type runner \
  --theme "cyberpunk neon city" \
  --mechanics "fast-paced, dodging, collecting"
```

The AI will:
1. Generate unique game code for the selected type
2. Create AI-generated splash screen and icon
3. Configure with your theme
4. Set up 10 levels (3 playable, 7 "coming soon")
5. Create a GitHub repo
6. Set up CI/CD pipeline
7. Push everything to GitHub

### Deploy the Game

```bash
npm run dev -- deploy-game --game <game-id>
```

The system will:
- Run tests
- Build Android app
- Submit to Google Play

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete installation and configuration
- **[Workflows Guide](docs/WORKFLOWS.md)** - Common usage patterns
- **[Architecture Overview](ai-overview.md)** - Detailed technical documentation

## 🎮 Game Template

Each generated game includes:

- ✅ **10 Levels** (3 playable on launch, 7 "coming soon" for future updates)
- 🎨 **5 Distinct Game Types** with unique mechanics and visual styles
- 🖼️ **AI-Generated Splash Screens** unique to each game
- 💰 Coin collection system
- ❤️ Lives system (5 lives to start)
- 🎯 Score tracking and high scores
- 📱 **AdMob** ads (banner + interstitial with smart frequency)
- 🛒 **In-app purchases** (coins and lives packs)
- 💾 Persistent game state with AsyncStorage
- 🧪 Comprehensive unit test suite
- 🎮 **Fully playable mechanics** for each game type

## 🔧 CLI Commands

```bash
# Generate a new game (choose from 5 game types)
npm run dev -- generate-game \
  --name "Neon Runner" \
  --type runner \
  --theme "cyberpunk neon city" \
  --mechanics "fast-paced, dodging"

# Available game types: runner, puzzle, word, card, platformer

# Deploy a game
npm run dev -- deploy-game --game <game-id>

# Analyze performance
npm run dev -- analyze-performance --days 30

# Extend winner with more levels (unlock levels 4-10)
npm run dev -- extend-game --game <game-id> --levels 10

# Sunset underperforming games
npm run dev -- sunset-games --exclude <winner-game-id>

# List all games
npm run dev -- list-games
```

## 📊 The Experiment Workflow

### Phase 1: Generate (Week 1)

Generate 10 different games with varied mechanics:

```bash
# Runner games
npm run generate -- --name "Space Runner" --type runner

# Puzzle games
npm run generate -- --name "Gem Match" --type match3

# Platform games
npm run generate -- --name "Ninja Jump" --type platformer

# ... 7 more games
```

### Phase 2: Deploy (Week 1-2)

Deploy all games to Google Play internal testing:

```bash
for game in game-01 game-02 ... game-10; do
  npm run deploy -- --game $game
done
```

### Phase 3: Market Test (Weeks 3-10)

Run marketing campaigns for all 10 games:
- Google Ads
- Facebook Ads
- App Store Optimization
- Track performance metrics

### Phase 4: Analyze (Week 11)

Identify the winner based on:
- Install count
- 7-day retention rate
- Revenue per user
- Crash-free rate

```bash
npm run analyze -- --days 60
```

### Phase 5: Extend Winner (Week 12)

Add 10 new levels to the winning game:

```bash
npm run extend -- --game <winner-id> --levels 10
```

### Phase 6: Sunset Losers (Week 12)

Archive underperforming games:

```bash
npm run sunset -- --exclude <winner-id>
```

## 🎯 Game Types Supported

### Fully Implemented Game Types

1. **Runner** 🏃 - Neon cyber theme, auto-scrolling with lane-switching mechanics
   - **Theme**: Neon Cyber (cyan, magenta, neon green)
   - **Mechanics**: Jump between 3 lanes, avoid obstacles, collect coins
   - **Visual Style**: Fast, high-contrast, futuristic HUD

2. **Puzzle** 🧩 - Zen-themed match-3 puzzle game
   - **Theme**: Zen Minimal (soft pastels, calming)
   - **Mechanics**: Swap adjacent tiles, match 3+ of same color
   - **Visual Style**: Slow animations, minimal UI, peaceful

3. **Word** 📝 - Tower-style word puzzle game
   - **Theme**: Clean Typography (black/white with blue accent)
   - **Mechanics**: Form words from letter grid
   - **Visual Style**: Clear fonts, grid-based, modern

4. **Card** 🃏 - Pazaak-style card duel game
   - **Theme**: Tabletop (green felt, gold accents)
   - **Mechanics**: Strategic card play, reach 20 without busting
   - **Visual Style**: Casino aesthetic, card flip animations

5. **Platformer** 🪂 - Classic 2D platformer
   - **Theme**: Adventure (nature tones, cheerful)
   - **Mechanics**: Jump, move left/right, reach the flag
   - **Visual Style**: Bouncy animations, cartoon-like

### Visual Diversity
Each game type has:
- ✨ Unique color palette
- 🎨 Custom UI layout
- ⚡ Distinctive animation style
- 🖼️ Theme-specific AI-generated assets

## 💰 Monetization

Each game includes:

### AdMob Integration
- Banner ads on menu screens
- Interstitial ads between levels
- Configurable frequency

### In-App Purchases
- **50 Coins** - $0.99
- **100 Coins** - $1.99
- **500 Coins** - $4.99
- **5 Lives** - $0.99

## 🧪 Testing

The system includes automated testing:

```bash
# Run tests for a game
cd generated-games/game-01-runner
npm test
```

Tests cover:
- Level configuration
- Game state logic
- Score calculation
- Level progression

AI-powered self-healing attempts to fix failing tests automatically.

## 📈 Analytics & Metrics

Track comprehensive metrics:

- **Install Count** - Total downloads
- **DAU** - Daily active users
- **Retention Rates** - 1-day, 7-day, 30-day
- **ARPU** - Average revenue per user
- **ARPDAU** - Average revenue per daily active user
- **Ad Metrics** - Impressions, eCPM
- **IAP Metrics** - Conversion rate, revenue
- **Crash Rate** - Stability metric

Winner is determined by weighted score:
```
Score = (Installs × 0.25) + (7-day Retention × 0.30) + 
        (ARPDAU × 0.25) + (Crash-free Rate × 0.10) + 
        (1-day Retention × 0.10)
```

## 🔐 Security

- All credentials stored in `.env` (gitignored)
- GitHub Secrets for CI/CD
- Service account keys for Google Play API
- Encrypted IAP verification

Never commit:
- `.env` file
- `secrets/` directory
- API keys or tokens

## 💵 Cost Estimates

Monthly operational costs:

- **Anthropic API** (code generation): ~$50-100
- **OpenAI API** (image generation): ~$20-40 (optional)
- **Expo EAS**: $29/month
- **Google Play**: $25 one-time
- **Google Cloud**: ~$5-10
- **GitHub**: Free (public repos)

**Total**: ~$130-200/month + $25 setup

**Note**: Image generation is optional. Without it, games use fallback placeholder images.

## 🛠️ Technology Stack

- **Agent**: Node.js + TypeScript
- **Games**: Expo (React Native)
- **AI**: Claude (Anthropic)
- **Version Control**: GitHub
- **CI/CD**: GitHub Actions + EAS
- **Build**: Expo Application Services
- **Deploy**: Google Play Developer API
- **Ads**: AdMob
- **IAP**: React Native IAP

## 🤝 Contributing

This is a personal project template, but contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Anthropic for Claude API
- Expo team for amazing tools
- React Native community
- Google Play Developer API

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 🚦 Project Status

✅ **Core Features Complete**
- [x] AI code generation (game logic)
- [x] **AI image generation (splash screens & icons)**
- [x] **5 fully playable game types**
- [x] **10-level system (3 playable, 7 locked)**
- [x] GitHub integration
- [x] EAS builds & deployment
- [x] Google Play submission
- [x] **Clean monetization API** (AdMob + IAP)
- [x] Analytics framework
- [x] CLI interface with game type selection
- [x] Comprehensive test suite

🔄 **Ready for Use**
- ✅ Generate diverse, playable games
- ✅ Each game has unique visuals
- ✅ Automated deployment pipeline
- ✅ Winner selection & extension workflow

💡 **Future Enhancements**
- [ ] iOS support (App Store)
- [ ] Backend integration (leaderboards, cloud save)
- [ ] Localization (10+ languages)
- [ ] A/B testing framework
- [ ] More game types (shooter, racing, strategy)

---

**Ready to generate your first game? Start with the [Setup Guide](docs/SETUP.md)!**
