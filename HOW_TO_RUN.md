# 🎮 How to Run the AI Mobile Game Generator

**3 Simple Steps to Generate Your First Game**

---

## 📦 Step 1: Setup (5 minutes)

### Install Dependencies

```bash
# Clone and navigate to project
git clone https://github.com/RoniAbravaya/AIMobileGameGenerator
cd AIMobileGameGenerator

# Install agent dependencies
cd agent && npm install

# Install game template dependencies
cd ../game-template && npm install

# Return to root
cd ..
```

### Configure API Keys

```bash
# Copy environment template
cp .env.template .env

# Edit .env file and add your Anthropic API key
nano .env  # or use any text editor
```

**Required in `.env`**:
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Get from console.anthropic.com
```

**Optional (for AI images)**:
```env
IMAGE_API_KEY=sk-xxxxx          # Get from platform.openai.com
```

---

## 🚀 Step 2: Generate a Game (2-3 minutes)

```bash
cd agent

# Generate your first game!
npm run dev -- generate-game
```

**What happens**:
1. 🧠 AI designs a unique game (30s)
2. 💻 Generates complete code (45s)
3. 🎨 Creates custom theme (5s)
4. 🖼️ Generates AI images (60s) *if API key provided*
5. ✅ Validates quality (10s)

**Output**: `generated-games/game-abc123/`

**Cost**: $2-5 (depending on retries)

---

## 🎮 Step 3: Run the Game (1 minute)

### Option A: Test on Mobile (Recommended)

```bash
cd ../generated-games/game-abc123

# Install dependencies
npm install

# Start dev server
npm start
```

**Then**:
1. Install **Expo Go** app on your phone
2. Scan the QR code
3. Play your game!

### Option B: Test on Web (Limited)

```bash
npm start
# Press 'w' to open in browser
```

---

## 📊 Visual Flow

```
┌─────────────────────────────────────────────────────┐
│  STEP 1: SETUP                                      │
│  ├─ npm install (agent + game-template)            │
│  └─ Configure .env with API keys                    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────┐
│  STEP 2: GENERATE                                   │
│  ├─ npm run dev -- generate-game                    │
│  ├─ AI designs game (Claude)                        │
│  ├─ Generates code (TypeScript/React Native)        │
│  ├─ Creates theme (colors, fonts, animations)       │
│  ├─ Generates images (DALL-E 3) [optional]          │
│  └─ Validates quality (70/100 min)                  │
│                                                       │
│  OUTPUT: generated-games/game-abc123/               │
└─────────────────┬───────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────┐
│  STEP 3: RUN                                        │
│  ├─ cd generated-games/game-abc123                 │
│  ├─ npm install                                      │
│  ├─ npm start                                        │
│  └─ Scan QR code with Expo Go app                   │
│                                                       │
│  RESULT: Playable game on your phone! 🎉           │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Commands Reference

### Generate Games

```bash
# Basic generation
npm run dev -- generate-game

# With specific mood
npm run dev -- generate-game --hints '{"mood": "dark"}'

# With specific style
npm run dev -- generate-game --hints '{"style": "minimal"}'

# Multiple hints
npm run dev -- generate-game --hints '{"mood": "neon", "style": "retro"}'
```

### Run Generated Game

```bash
cd generated-games/game-abc123
npm install        # First time only
npm start         # Start dev server
```

### Build for Production

```bash
# Install EAS CLI (first time only)
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview

# Build AAB (for Play Store)
eas build --platform android --profile production
```

---

## 🎨 Customization Examples

### 1. Dark Space Theme

```bash
npm run dev -- generate-game --hints '{
  "mood": "dark",
  "style": "minimal",
  "tone": "atmospheric"
}'
```

**Result**: Space shooter with dark backgrounds, minimal UI

### 2. Neon Runner Theme

```bash
npm run dev -- generate-game --hints '{
  "mood": "neon",
  "style": "modern",
  "tone": "energetic"
}'
```

**Result**: Fast-paced runner with vibrant neon colors

### 3. Zen Puzzle Theme

```bash
npm run dev -- generate-game --hints '{
  "mood": "calm",
  "style": "elegant",
  "tone": "relaxing"
}'
```

**Result**: Peaceful puzzle game with soft colors

---

## 📂 Project Structure

After generation, you'll have:

```
AIMobileGameGenerator/
├── agent/                    # AI generation system
│   ├── src/
│   │   ├── orchestrators/    # Generation workflow
│   │   ├── generators/       # Code/theme/image generators
│   │   ├── validators/       # Quality validation
│   │   ├── models/          # GameSpec definition
│   │   └── services/        # AI/Image APIs
│   └── package.json
│
├── game-template/           # Base game template
│   ├── app/
│   │   ├── game/runtime/   # 2D game engine
│   │   ├── screens/        # Navigation screens
│   │   ├── components/     # UI components
│   │   └── theme/          # Theme system
│   └── package.json
│
├── generated-games/        # Your generated games
│   ├── game-abc123/       # Game 1
│   ├── game-def456/       # Game 2
│   └── ...
│
├── .env                    # Your API keys (create this)
├── .env.template          # Template for .env
└── QUICK_START.md         # This file
```

---

## 🔍 What Each Generated Game Contains

```
generated-games/game-abc123/
├── app/
│   ├── game/
│   │   ├── entities.ts              # Player, enemies, obstacles
│   │   ├── gameLogic.ts             # Win/lose, scoring, collision
│   │   └── GameScreen.tsx           # Main game component
│   ├── theme/
│   │   └── generatedTheme.ts        # Colors, fonts, animations
│   ├── screens/
│   │   ├── SplashScreen.tsx         # App launch screen
│   │   ├── MenuScreen.tsx           # Main menu
│   │   └── LevelSelectScreen.tsx    # 10 level badges
│   └── components/
│       └── ThemedUI.tsx             # Buttons, text, cards
│
├── assets/generated/
│   ├── splash.png                   # AI-generated splash
│   ├── menu-bg.png                  # Menu background
│   └── scene-bg.png                 # Gameplay background
│
├── package.json
├── app.json                         # Expo configuration
└── README.md                        # Game-specific README
```

---

## ✅ Verification Checklist

After running the system, verify:

- [ ] Agent dependencies installed (`agent/node_modules/` exists)
- [ ] Game template dependencies installed (`game-template/node_modules/` exists)
- [ ] `.env` file created with `ANTHROPIC_API_KEY`
- [ ] Generation completes without errors
- [ ] Generated game folder exists (`generated-games/game-*/`)
- [ ] Generated game has 3 code files (entities, gameLogic, GameScreen)
- [ ] Generated game has theme file
- [ ] Generated game has 3 images (or placeholders)
- [ ] `npm start` works in generated game folder
- [ ] Game runs on mobile via Expo Go

---

## 🐛 Common Issues

### Issue: "Cannot find module '@anthropic-ai/sdk'"

**Solution**:
```bash
cd agent
npm install
```

### Issue: "API key not configured"

**Solution**:
```bash
# Make sure .env exists in root directory
# and contains: ANTHROPIC_API_KEY=sk-ant-xxxxx
cat .env  # Verify
```

### Issue: "Generation failed after 5 attempts"

**Solution**:
- Check API key has credits
- Try simpler hints: `--hints '{"mood": "calm"}'`
- Check internet connection
- Review error logs

### Issue: "npm start fails in generated game"

**Solution**:
```bash
cd generated-games/game-abc123
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## 💡 Pro Tips

### 1. Generate Multiple Games

```bash
# Generate 5 games with different themes
for mood in energetic calm dark neon retro; do
  npm run dev -- generate-game --hints "{\"mood\": \"$mood\"}"
  sleep 180  # Wait 3 minutes between generations
done
```

### 2. Test Without API Costs

```bash
# Run tests (no API calls)
cd agent
npm test
```

### 3. View Generation Stats

After generation, check:
```
generated-games/game-abc123/generation-stats.json
```

Contains:
- Quality scores
- Cost breakdown
- Number of attempts
- Generation time

### 4. Customize Further

Edit generated files:
- `app/theme/generatedTheme.ts` - Change colors
- `app/game/gameLogic.ts` - Tweak mechanics
- `app/screens/*.tsx` - Modify UI

---

## 🎉 Success Criteria

You've successfully run the system when:

1. ✅ Generation completes without errors
2. ✅ Quality score is 70+ (shown in console)
3. ✅ Game folder exists with all files
4. ✅ `npm start` launches the game
5. ✅ Game is playable on mobile/web

**Congratulations! You now have an AI-generated mobile game!** 🎮

---

## 📚 Next Steps

1. **Test the Game**: Play all 3 levels
2. **Generate More**: Try different themes
3. **Build APK**: Use EAS build
4. **Deploy**: Submit to Google Play (requires setup)
5. **Read Docs**: [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## 🆘 Need More Help?

- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Full Setup**: [docs/SETUP.md](./docs/SETUP.md)
- **Architecture**: [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- **Main README**: [README.md](./README.md)

---

**Ready to generate games? Start with Step 1! 🚀**
