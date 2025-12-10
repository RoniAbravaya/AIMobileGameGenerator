# EAS Build Workflow Fix - Complete Setup Guide

## Problem Identified

The GitHub workflow was failing with:
```
Experience with id '1b421672-b903-46bc-b45d-33adbdd002c9' does not exist.
Error: GraphQL request failed.
```

### Root Cause

The generated games were creating random UUIDs as `projectId` in `app.json`, but these projects don't actually exist in your Expo account. The EAS CLI tries to build for a non-existent project, causing the failure.

## Solution Implemented

### 1. Updated Workflow Logic

The CI/CD workflow now:
- ✅ Checks if `EXPO_TOKEN` is configured (prevents auth errors)
- ✅ Validates that `projectId` exists in `app.json` (prevents GraphQL errors)
- ✅ Gracefully skips builds when prerequisites aren't met
- ✅ Provides detailed setup instructions when builds are skipped
- ✅ Better error reporting for failed builds

### 2. Files Updated

**All generated games:**
- `/workspaces/AIMobileGameGenerator/agent/generated-games/game-*/. github/workflows/ci.yml`

**Generator template:**
- `/workspaces/AIMobileGameGenerator/agent/src/generators/game-generator.ts`

## How to Enable EAS Builds

### Step 1: Create an Expo Account and Project

```bash
# If you don't have Expo CLI installed:
npm install -g eas-cli expo-cli

# Log in to Expo
eas login

# Create a new project (run this in your game directory)
npx eas init
```

This will:
- Create a new Expo project
- Generate a unique `projectId`
- Update your `app.json` with the correct projectId

### Step 2: Get Your EXPO_TOKEN

```bash
# Generate an access token
eas credentials
# Or visit: https://expo.dev/settings/access-tokens
```

**Create a new token:**
1. Go to https://expo.dev/settings/access-tokens
2. Click "Create token"
3. Give it a name like "GitHub Actions"
4. Copy the token value

### Step 3: Add EXPO_TOKEN to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `EXPO_TOKEN`
5. Paste your token
6. Click **Add secret**

### Step 4: Verify Setup

The next push to `main` branch will trigger the workflow. You should see:
- ✅ Tests run (always)
- ✅ Build runs (only if both prerequisites are met)

If build still skips, check:
```bash
# Verify projectId is set
node -e "console.log(require('./app.json').expo.extra.eas.projectId)"

# Should output a valid UUID, not empty
```

## Understanding the Updated Workflow

### When Build Runs
- `EXPO_TOKEN` is configured in GitHub secrets
- `projectId` exists and is valid in `app.json`
- Push is to `main` branch

### When Build Skips
- Displays notice with setup instructions
- Lists helpful commands
- No failed workflow (intentional skip)

### Build Failure Handling

If build fails even with prerequisites met, common causes:
1. **Invalid projectId** - Project doesn't exist in Expo
2. **Expired/Invalid EXPO_TOKEN** - Check token in settings
3. **Insufficient permissions** - Token needs proper scopes
4. **EAS Build service issue** - Check status.expo.dev

## Troubleshooting

### "projectId not found in app.json"
```bash
# Fix: Run eas init again
npx eas init

# Or manually update app.json:
# Change from: "projectId": "random-uuid-that-doesnt-exist"
# To: "projectId": "your-real-project-id"
```

### "EXPO_TOKEN not configured"
```bash
# Create token at: https://expo.dev/settings/access-tokens
# Add to GitHub secrets as shown in Step 3 above
```

### "Experience with id 'xxx' does not exist"
This means:
1. The projectId in `app.json` doesn't exist in Expo
2. Solution: Run `npx eas init` to create/link a real project

### Build still fails after setup

Check Expo status:
```bash
# Verify you're logged in
eas whoami

# Check project info
eas project:info

# View build logs from CLI
eas build --platform android --status

# Or check logs in Expo Dashboard
# https://expo.dev/projects/[projectId]/builds
```

## Environment Variables in Workflow

The updated workflow properly uses:
```yaml
env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

This ensures the token is:
- ✅ Properly injected into the environment
- ✅ Not logged in workflow output
- ✅ Available to EAS CLI commands
- ✅ Masked in GitHub logs

## Next Steps

1. ✅ Run `npx eas init` in your game directory
2. ✅ Add `EXPO_TOKEN` to GitHub secrets
3. ✅ Push a change to trigger the workflow
4. ✅ Monitor: Actions tab → CI/CD Pipeline
5. ✅ Check build: Expo Dashboard → Projects

## For New Generated Games

Future games generated will now:
- Include the updated workflow
- Check for valid `projectId` before building
- Skip gracefully with helpful instructions if not configured
- Provide clear setup guidance in workflow output

## Quick Reference Commands

```bash
# Setup Expo project
npx eas init

# Get current projectId
npx eas-cli project:info

# Get your account info
eas whoami

# Build locally (for testing)
eas build --platform android --profile production

# Check build status
eas build --status

# View EAS config
cat eas.json

# View Expo project config
cat app.json | jq '.expo.extra.eas'
```

## Additional Resources

- Expo Documentation: https://docs.expo.dev
- EAS Build Docs: https://docs.expo.dev/eas-update/getting-started/
- GitHub Actions: https://docs.github.com/en/actions
- EAS CLI Reference: https://docs.expo.dev/reference/eas-cli/
