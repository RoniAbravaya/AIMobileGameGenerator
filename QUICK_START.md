# 🚀 Quick Start Guide - AI Mobile Game Generator

**Last Updated**: December 9, 2025

This guide will get you up and running in ~10 minutes.

---

## 📋 What You'll Need

### Required
- **Node.js 18+** ([download](https://nodejs.org/))
- **Anthropic API Key** ([get here](https://console.anthropic.com))

### Optional (but recommended)
- **OpenAI API Key** for AI-generated images ([get here](https://platform.openai.com))
- **GitHub Account** for automated repo creation
- **Expo Account** for building/deploying apps

---

## ⚡ Quick Setup (5 minutes)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/RoniAbravaya/AIMobileGameGenerator
cd AIMobileGameGenerator

# Install agent dependencies
cd agent
npm install

# Install game template dependencies
cd ../game-template
npm install
```

### 2. Configure Environment

```bash
# Go back to root
cd ..

# Create environment file
cp .env.template .env
```

**Edit `.env`** and add your API keys:

```env
# Required: Anthropic API key for code generation
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional: OpenAI API key for AI images (otherwise uses placeholders)
IMAGE_API_KEY=sk-xxxxx
IMAGE_API_PROVIDER=openai

# Optional: GitHub token for automated repo creation
GIT_TOKEN=ghp_xxxxx
GITHUB_ORG=your-username

# Optional: Expo token for builds
EXPO_TOKEN=xxxxx
```

**That's it!** You're ready to generate games.

---

## 🎮 Generate Your First Game (2 minutes)

### Option 1: Test Generation (No API calls)

Test the system without spending API credits:

```bash
cd agent
npm test
```

### Option 2: Generate a Real Game

```bash
cd agent

# Generate with default settings (costs ~$2-3)
npm run dev -- generate-game
```

This will:
1. ✅ Design a unique game with Claude AI (~30s)
2. ✅ Generate complete game code (~45s)
3. ✅ Create custom theme (~5s)
4. ✅ Generate AI images (if API key provided) (~60s)
5. ✅ Validate quality (~10s)
6. ✅ Save to `./generated-games/`

**Total time**: 2-3 minutes  
**Cost**: $2-5 depending on retries

---

## 🎯 What You Get

After generation completes, you'll have a complete mobile game:

```
generated-games/game-abc123/
├── app/
│   ├── game/
│   │   ├── entities.ts          # Game entities (player, obstacles, etc.)
│   │   ├── gameLogic.ts         # Game mechanics and rules
│   │   └── GameScreen.tsx       # Main game screen
│   ├── theme/
│   │   └── generatedTheme.ts    # Custom color theme
│   ├── screens/
│   │   ├── SplashScreen.tsx     # Splash screen
│   │   ├── MenuScreen.tsx       # Main menu
│   │   └── LevelSelectScreen.tsx # Level selection (10 levels)
│   └── components/
│       └── ThemedUI.tsx         # Themed UI components
├── assets/
│   └── generated/
│       ├── splash.png           # AI-generated splash image
│       ├── menu-bg.png          # Menu background
│       └── scene-bg.png         # Gameplay background
├── package.json
├── app.json
└── README.md
```

---

## 🏃 Run the Generated Game

### Test on Your Computer (Development)

```bash
cd generated-games/game-abc123

# Install dependencies (first time only)
npm install

# Start development server
npm start
```

Then:
- **On mobile**: Install Expo Go app, scan QR code
- **On web** (limited): Press `w` to open in browser

### Build for Android (Production)

```bash
# Install EAS CLI (first time only)
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK (for testing)
eas build --platform android --profile preview

# Build AAB (for Play Store)
eas build --platform android --profile production
```

Build takes ~10-15 minutes. You'll get a download link when complete.

---

## 🎨 Customize Generation

### Generate with Specific Theme

```bash
npm run dev -- generate-game --hints '{"mood": "dark", "style": "minimal"}'
```

### Available Moods
- `energetic` - Vibrant, fast-paced (default)
- `calm` - Peaceful, zen-like
- `dark` - Moody, atmospheric
- `neon` - Cyberpunk, high-contrast
- `retro` - Pixel art, nostalgic
- `space` - Sci-fi, cosmic
- `nature` - Organic, earthy
- `fire` - Intense, warm colors
- `ice` - Cool, crystalline
- `pastel` - Soft, gentle

### Available Styles
- `modern` - Clean, contemporary (default)
- `minimal` - Simple, focused
- `retro` - Vintage, pixel art
- `elegant` - Sophisticated, refined
- `playful` - Fun, cartoonish

---

## 📊 Check Generation Quality

After generation, you'll see a quality report:

```
✅ Game Generated Successfully!

Quality Score: 82/100
  - Code Quality:    85/100 ✅
  - Gameplay:        78/100 ✅
  - Visual Quality:  82/100 ✅

Cost: $3.20
Duration: 2m 15s
Attempts: 2 (first failed, second succeeded)
```

**Quality Thresholds**:
- **70-79**: Acceptable (playable but basic)
- **80-89**: Good (recommended for release)
- **90-100**: Excellent (high polish)

---

## 🔄 If Generation Fails

The system automatically retries up to 5 times with improvements:

```
Attempt 1: Quality 65/100 ❌ (too low)
Attempt 2: Quality 78/100 ✅ (success!)
```

If all retries fail, it falls back to a generic template:
- ✅ Still playable
- ✅ Still has your theme
- ✅ Uses generic mechanics (simple runner game)

---

## 🎮 Game Features

Every generated game includes:

### Core Gameplay
- ✅ **Unique mechanics** (AI-designed)
- ✅ **10 levels** (3 playable, 7 "coming soon")
- ✅ **Lives system** (3 lives)
- ✅ **Score tracking**
- ✅ **Win/lose conditions**
- ✅ **Level progression**

### Visuals
- ✅ **Custom theme** (colors, fonts, animations)
- ✅ **AI-generated images** (splash, backgrounds)
- ✅ **Themed UI components**
- ✅ **Smooth animations** (60 FPS)

### Screens
- ✅ **Splash screen** (with AI art)
- ✅ **Main menu**
- ✅ **Level select** (10 badges)
- ✅ **Gameplay**
- ✅ **Game over / Win screens**

### Tech
- ✅ **React Native / Expo**
- ✅ **TypeScript** (strict mode)
- ✅ **60 FPS game loop**
- ✅ **Touch controls** (tap, swipe, drag)
- ✅ **Physics engine** (2D, collision detection)
- ✅ **Local progress** (AsyncStorage)

---

## 🐛 Troubleshooting

### "API key not configured"

Make sure `.env` file exists and contains:
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### "Generation failed after 5 attempts"

This is rare but can happen. Check:
- Your API key has credits
- Internet connection is stable
- Try with simpler hints: `{"mood": "calm"}`

### "Quality score too low"

The system will retry automatically. If quality is still low after 5 attempts:
- You'll get a fallback template (still playable)
- Or you can regenerate with different hints

### "npm install fails"

Make sure you have:
- Node.js 18 or higher
- Stable internet connection
- Try: `npm cache clean --force && npm install`

---

## 💰 Cost Breakdown

### Per Game Generation

**Minimum** (succeeds on first try):
- GameSpec design: $0.05
- Mechanics code: $1.00
- AI images: $1.00
- **Total: $2.05**

**Average** (1-2 retries):
- **Total: $3-4**

**Maximum** (5 retries):
- **Total: $10**

**Budget limit**: $5 per game (stops after budget exceeded)

### Monthly Costs (10 games)

- Generation: $30-50 (one-time)
- Expo EAS: $29/month (for builds)
- **Total: $30-50 setup + $29/month**

---

## 🎯 Next Steps

### 1. Test Your Game
```bash
cd generated-games/game-abc123
npm start
```

### 2. Generate More Games
```bash
cd ../../agent

# Generate 10 different games
for i in {1..10}; do
  npm run dev -- generate-game
  sleep 180  # Wait 3 minutes between generations
done
```

### 3. Build & Deploy
```bash
cd ../generated-games/game-abc123
eas build --platform android --profile production
```

### 4. Read Full Docs
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - System architecture
- **[README.md](./README.md)** - Full documentation
- **[docs/SETUP.md](./docs/SETUP.md)** - Detailed setup

---

## 🆘 Need Help?

### Check Documentation
- [Architecture](./PROJECT_STATUS.md)
- [Setup Guide](./docs/SETUP.md)
- [Game Template](./game-template/README.md)

### Common Issues
- **Low quality**: Regenerate with different hints
- **API errors**: Check your API key and credits
- **Build errors**: Make sure Expo CLI is installed

### Resources
- [Expo Docs](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [Anthropic API](https://docs.anthropic.com/)

---

## 🎉 Success!

You should now have:
- ✅ A complete, playable mobile game
- ✅ Unique gameplay and visuals
- ✅ Ready to build and deploy
- ✅ All source code and assets

**Time to generate**: 2-3 minutes  
**Cost**: $2-5  
**Result**: Production-ready game

---

**Have fun generating games! 🎮**
