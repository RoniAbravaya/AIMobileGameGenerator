# EAS Build Workflow - Quick Start Checklist

## The Problem ❌

```
Experience with id 'xxxxx-xxxxx-xxxxx' does not exist.
Error: GraphQL request failed.
```

**Root Cause:** Expo project doesn't exist for the `projectId` in `app.json`

## The Solution ✅

All workflows have been updated to:
1. Validate prerequisites before building
2. Skip gracefully if configuration is incomplete
3. Provide clear setup instructions

## Quick Setup (5 minutes)

### ☐ Step 1: Initialize Expo Project
```bash
cd agent/generated-games/[YOUR-GAME-NAME]
npx eas init
```
- This creates an Expo project
- Updates `app.json` with real `projectId`
- Creates `eas.json` config

### ☐ Step 2: Create EXPO_TOKEN
```
1. Go to: https://expo.dev/settings/access-tokens
2. Click "Create token"
3. Give it a name like "GitHub Actions"
4. Copy the token
```

### ☐ Step 3: Add to GitHub Secrets
```
1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: EXPO_TOKEN
5. Paste the token
6. Click "Add secret"
```

### ☐ Step 4: Push to Trigger Workflow
```bash
git add .
git commit -m "Setup EAS build"
git push origin main
```

### ☐ Step 5: Monitor Build
```
1. Go to: Actions tab in GitHub
2. Click "CI/CD Pipeline"
3. Watch the build progress
4. (Optional) Check: https://expo.dev/projects/[projectId]/builds
```

## What Happens Now

### ✅ When Prerequisites Are Met
- Tests run
- Build runs
- App is built
- Build completes successfully

### ⚠️ When Prerequisites Are Missing
- Tests run
- Build is **skipped** (intentional, not a failure)
- Workflow displays setup instructions
- Workflow shows helpful commands

### ❌ If Build Fails Despite Prerequisites
- Error message shows likely cause
- Check GitHub Actions logs
- Verify token is valid
- Check Expo dashboard for details

## Verify Setup

```bash
# Check projectId is set
node -e "console.log(require('./app.json').expo.extra.eas.projectId)"
# Should print: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Check Expo is set up
eas project:info
# Should show your project details

# Check token is valid
eas whoami
# Should show: "Authenticated as [your-email]"
```

## Common Issues

| Issue | Fix |
|-------|-----|
| `projectId not in app.json` | Run `npx eas init` |
| `EXPO_TOKEN not configured` | Add to GitHub secrets (Step 3) |
| `Experience not found` | Run `npx eas init` to get real projectId |
| Build still fails | Check `eas build --status` |

## Files Modified

✅ All 6 generated games have updated workflows:
- `game-021c866b-runner/.github/workflows/ci.yml`
- `game-60970b7b-runner/.github/workflows/ci.yml`
- `game-a3347baf-runner/.github/workflows/ci.yml`
- `game-e8780851-runner/.github/workflows/ci.yml`
- `game-f96eee8e-shooter/.github/workflows/ci.yml`
- `game-fea44cb3-runner/.github/workflows/ci.yml`

✅ Generator template updated:
- `agent/src/generators/game-generator.ts`

✅ Documentation created:
- `EAS_BUILD_SETUP_FIX.md` (comprehensive guide)
- `EAS_WORKFLOW_FIX_SUMMARY.md` (detailed explanation)
- `scripts/setup-eas-build.sh` (automated setup)

## Need Help?

### Automated Setup
```bash
bash scripts/setup-eas-build.sh
# Walks you through all steps
```

### Manual Verification
```bash
# Verify project setup
eas project:info

# Verify authentication
eas whoami

# Test build locally
eas build --platform android --profile production --dry-run

# Check recent builds
eas build --status
```

### Read Documentation
- `EAS_WORKFLOW_FIX_SUMMARY.md` - Full explanation of changes
- `EAS_BUILD_SETUP_FIX.md` - Complete setup guide with troubleshooting

### External Resources
- Expo: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/eas-update/getting-started/
- Access Tokens: https://expo.dev/settings/access-tokens

## Timeline

- **Before:** ❌ Builds fail with "Experience not found" error
- **Now:** ✅ Workflows check prerequisites
- **If incomplete:** ⚠️ Build skips gracefully with setup instructions
- **After setup:** ✅ Builds run successfully

## Next Actions

1. ☐ Run `npx eas init` for each game
2. ☐ Create EXPO_TOKEN at https://expo.dev/settings/access-tokens
3. ☐ Add EXPO_TOKEN to GitHub secrets
4. ☐ Push changes to trigger workflow
5. ☐ Monitor Actions tab for successful build

**You've got this! 🚀**
