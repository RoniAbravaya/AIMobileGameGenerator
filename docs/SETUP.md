# Setup Guide

Complete setup guide for the AI Mobile Game Generator.

## Prerequisites

### Required Software

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Git** ([Download](https://git-scm.com/))
- **Expo CLI**: `npm install -g expo-cli eas-cli`

### Required Accounts

1. **GitHub Account**
   - Create at [github.com](https://github.com)
   - Generate Personal Access Token:
     - Go to Settings → Developer settings → Personal access tokens
     - Generate new token (classic)
     - Select scopes: `repo`, `workflow`, `write:packages`
     - Save the token securely

2. **Expo Account**
   - Create at [expo.dev](https://expo.dev)
   - Login: `expo login`
   - Generate Access Token:
     - Go to expo.dev → Account Settings → Access Tokens
     - Create new token
     - Save the token

3. **Google Play Developer Account**
   - Register at [play.google.com/console](https://play.google.com/console)
   - Pay one-time $25 registration fee
   - Complete account verification

4. **Google Cloud Project** (for Play API)
   - Create project at [console.cloud.google.com](https://console.cloud.google.com)
   - Enable Google Play Developer API
   - Create Service Account:
     - IAM & Admin → Service Accounts → Create
     - Grant role: "Service Account User"
     - Create JSON key → Download and save
   - Link to Play Console:
     - Play Console → Settings → API access
     - Link the service account
     - Grant permissions

5. **AdMob Account**
   - Create at [admob.google.com](https://admob.google.com)
   - Create an app
   - Generate ad units:
     - Banner Ad
     - Interstitial Ad
   - Note down App ID and Ad Unit IDs

6. **Anthropic API Key**
   - Get from [console.anthropic.com](https://console.anthropic.com)
   - Generate API key
   - Save securely

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd workspace
```

### 2. Install Agent Dependencies

```bash
cd agent
npm install
```

### 3. Install Game Template Dependencies

```bash
cd ../game-template
npm install
```

### 4. Configure Environment Variables

Create `.env` file in the root directory:

```bash
cp .env.template .env
```

Edit `.env` and fill in your credentials:

```env
# AI API Configuration
ANTHROPIC_API_KEY=sk-ant-xxxxx

# GitHub Configuration
GITHUB_TOKEN=ghp_xxxxx
GITHUB_ORG=your-github-username

# Expo/EAS Configuration
EXPO_TOKEN=xxxxx

# Google Play Configuration
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH=./secrets/google-play-key.json
GOOGLE_PLAY_PACKAGE_PREFIX=com.yourcompany.game

# AdMob Configuration
ADMOB_APP_ID=ca-app-pub-xxxxx~xxxxx
ADMOB_BANNER_ID=ca-app-pub-xxxxx/xxxxx
ADMOB_INTERSTITIAL_ID=ca-app-pub-xxxxx/xxxxx

# IAP Configuration
IAP_COINS_50_SKU=coins_50
IAP_COINS_100_SKU=coins_100
IAP_COINS_500_SKU=coins_500
IAP_LIVES_5_SKU=lives_5

# Agent Configuration
GENERATED_GAMES_DIR=./generated-games
MAX_RETRY_ATTEMPTS=3
AUTO_MERGE_ON_TEST_PASS=true
```

### 5. Add Google Play Service Account Key

```bash
mkdir -p secrets
# Copy your google-play-key.json to secrets/
cp /path/to/your/google-play-key.json secrets/
```

**Important**: Never commit this file to git! It's already in `.gitignore`.

### 6. Verify Configuration

```bash
cd agent
npm run dev -- init
```

You should see: ✅ Configuration is valid

## Google Play Setup

### Create First App Manually

The first time, you need to manually create an app in Play Console:

1. Go to [play.google.com/console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - App name
   - Default language
   - App or game: Game
   - Free or paid: Free
4. Complete the store listing:
   - App details
   - Graphics (icon, screenshots)
   - Privacy policy URL
5. Complete content rating questionnaire
6. Set up pricing & distribution
7. Create a release (internal testing first)

### Configure In-App Products

1. In Play Console → Your app → Monetize → In-app products
2. Create managed products:
   - Product ID: `coins_50`, Title: "50 Coins", Price: $0.99
   - Product ID: `coins_100`, Title: "100 Coins", Price: $1.99
   - Product ID: `coins_500`, Title: "500 Coins", Price: $4.99
   - Product ID: `lives_5`, Title: "5 Lives", Price: $0.99
3. Activate all products

## Testing the System

### Test 1: Generate a Simple Game

```bash
cd agent
npm run dev -- generate-game --interactive
```

Follow the prompts to create your first game.

### Test 2: Check Generated Game

```bash
cd ../generated-games/game-xxxxx-runner
npm install
npm test
```

### Test 3: Build Locally (Optional)

```bash
npm start
# Scan QR code with Expo Go app
```

### Test 4: Deploy

```bash
cd ../../agent
npm run dev -- deploy-game --game xxxxx
```

## Troubleshooting

### "Missing required environment variables"

Make sure your `.env` file exists and contains all required variables.

### "Failed to initialize Google Play API"

- Check that your service account JSON file exists
- Verify the service account is linked in Play Console
- Ensure API is enabled in Google Cloud

### "EAS build failed"

- Run `eas login` to authenticate
- Check that your Expo account has active subscription
- Verify `eas.json` is properly configured

### "GitHub API rate limit"

- Use a Personal Access Token (not password)
- Check token has correct scopes
- Wait for rate limit to reset (usually 1 hour)

### "Tests failing"

- Check that all dependencies are installed
- Run `npm install` in the game directory
- Review test logs for specific errors

## Next Steps

Once setup is complete:

1. Read [WORKFLOWS.md](./WORKFLOWS.md) for usage examples
2. Generate 10 games for your experiment
3. Deploy and monitor performance
4. Analyze and select winner
5. Extend winner with additional levels

## Security Best Practices

1. **Never commit secrets**
   - `.env` is gitignored
   - `secrets/` folder is gitignored
   - Use GitHub Secrets for CI/CD

2. **Rotate credentials regularly**
   - API keys every 90 days
   - Service account keys yearly

3. **Use separate accounts for testing**
   - Test with demo AdMob IDs first
   - Use internal testing track in Play Console

4. **Monitor API usage**
   - Check Anthropic API usage
   - Monitor Google Cloud quotas

## Support

If you encounter issues:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review logs in `agent/logs/`
3. Check GitHub Actions logs
4. Review EAS build logs

## Cost Estimates

Monthly costs for running 10 games:

- Anthropic API: ~$50-100 (depending on usage)
- Expo EAS: $29/month (Production plan)
- Google Play: $25 one-time
- Google Cloud: ~$0-10 (API calls)
- AdMob: Free (revenue generating)
- **Total**: ~$90-150/month + $25 setup

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Google Play Developer API](https://developers.google.com/android-publisher)
- [AdMob Documentation](https://developers.google.com/admob)
- [Anthropic API Docs](https://docs.anthropic.com/)
