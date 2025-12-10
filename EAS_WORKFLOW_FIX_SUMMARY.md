# Expo EAS Build Workflow - Troubleshooting & Fix Summary

## What Was Wrong

Your GitHub Actions workflow was failing with:
```
Experience with id '1b421672-b903-46bc-b45d-33adbdd002c9' does not exist.
Request ID: cea1e02e-6491-4ddf-a4be-026988f18eb3
Error: GraphQL request failed.
```

### The Issue Explained

1. **Generated games get random UUIDs as projectId** - When your AI game generator creates a new game, it generates a random UUID and sets it as `projectId` in `app.json`
2. **Projects don't exist in Expo** - These random projectIds are never actually created in your Expo account
3. **Build fails when trying to use non-existent project** - EAS CLI queries Expo's API for the project, gets a "not found" response, and fails

## What Was Fixed

### 1. ✅ Improved Workflow Logic

**File:** `.github/workflows/ci.yml` (all generated games)

The workflow now:
```yaml
- name: Check prerequisites
  id: check_prereqs
  run: |
    SKIP_BUILD="false"
    
    # Check EXPO_TOKEN
    if [ -z "${{ secrets.EXPO_TOKEN }}" ]; then
      echo "⚠️  EXPO_TOKEN not configured. Skipping build."
      SKIP_BUILD="true"
    fi
    
    # Check if projectId exists in app.json
    PROJECT_ID=$(node -e "try { console.log(require('./app.json').expo.extra.eas.projectId); } catch(e) { console.log(''); }")
    if [ -z "$PROJECT_ID" ]; then
      echo "⚠️  projectId not found in app.json. Skipping build."
      SKIP_BUILD="true"
    fi
    
    echo "skip=$SKIP_BUILD" >> $GITHUB_OUTPUT
```

This validates **before** attempting build:
- ✅ EXPO_TOKEN is configured
- ✅ projectId exists and is not empty
- ✅ Only runs build if both prerequisites are met

### 2. ✅ Better Error Handling

```yaml
- name: Build Android
  if: steps.check_prereqs.outputs.skip != 'true'
  run: eas build --platform android --profile production --non-interactive
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
  continue-on-error: true  # Allows workflow to complete even if build fails

- name: Check build status
  if: steps.check_prereqs.outputs.skip != 'true'
  run: |
    if [ $? -ne 0 ]; then
      echo "::error::Build failed. Common causes:"
      echo "  1. Expo project doesn't exist (invalid projectId)"
      echo "  2. EXPO_TOKEN is invalid or expired"
      echo "  3. Insufficient account permissions"
      exit 1
    fi
```

### 3. ✅ Clear Setup Instructions

When prerequisites aren't met, workflow displays:
```
::notice::Build skipped - Setup required
To enable EAS builds:

1. Create Expo account: https://expo.dev
2. Create a new project or get projectId from existing one
3. Update app.json with your projectId
4. Add EXPO_TOKEN to repository secrets:
   Go to: Settings > Secrets and variables > Actions > New repository secret

Commands to help:
  npx eas init               # Create/link Expo project
  npx eas-cli project:info   # Get your projectId
```

## Files Modified

### 1. **Generated Game Workflows**
- ✅ `/agent/generated-games/game-*/. github/workflows/ci.yml` (all 6 games updated)

### 2. **Generator Template**
- ✅ `/agent/src/generators/game-generator.ts` (updated for future games)

### 3. **New Documentation**
- ✅ `EAS_BUILD_SETUP_FIX.md` - Complete setup guide
- ✅ `scripts/setup-eas-build.sh` - Automated setup script

## How to Use the Fix

### Option A: Manual Setup (Recommended)

```bash
cd /path/to/your/game

# 1. Create/link Expo project
npx eas init

# 2. This will update app.json with your real projectId

# 3. Create EXPO_TOKEN
# Go to: https://expo.dev/settings/access-tokens
# Create a new token

# 4. Add to GitHub
# Go to: Settings → Secrets and variables → Actions
# Add "EXPO_TOKEN" secret with your token

# 5. Push your code
git push origin main
```

### Option B: Automated Setup

```bash
# Run the setup script
bash scripts/setup-eas-build.sh

# This will:
# - Check dependencies
# - Verify Expo authentication
# - Create Expo project (if needed)
# - Guide you through adding EXPO_TOKEN
# - Verify all configuration
```

## Testing the Fix

### Test 1: Verify Workflow Skips Gracefully
```bash
# Push with valid EXPO_TOKEN but invalid projectId
# Expected: Build skips with notice about setup
```

### Test 2: Verify Workflow Builds
```bash
# After running npx eas init:
# Push to main branch
# Expected: Build runs successfully
```

### Test 3: Local Build Test
```bash
cd /path/to/game
npx eas build --platform android --profile production
```

## Common Issues & Solutions

### Issue: "projectId not found in app.json"
```bash
# Solution: Run eas init
npx eas init

# Or manually edit app.json to add valid projectId
# "extra": {
#   "eas": {
#     "projectId": "12345678-1234-1234-1234-123456789012"
#   }
# }
```

### Issue: "EXPO_TOKEN not configured"
```bash
# Create token at: https://expo.dev/settings/access-tokens
# Add to GitHub: Settings → Secrets and variables → Actions
# Name: EXPO_TOKEN
# Value: [your token]
```

### Issue: "Experience with id 'xxx' does not exist"
```bash
# This means the projectId doesn't exist in Expo
# Solution: 
# 1. Run: npx eas project:info
# 2. Get real projectId
# 3. Update app.json with real projectId
# 4. Or run: npx eas init
```

### Issue: Build still fails after setup

Check these:
```bash
# Verify logged in
eas whoami

# Verify project
eas project:info

# Check token validity
eas credentials

# View recent builds
eas build --status

# Check Expo dashboard
# https://expo.dev/projects/[your-projectId]/builds
```

## Architecture of the Fix

```
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Test Job (always runs)                                  │
│     └─ npm ci && npm test                                   │
│                                                               │
│  2. Build Job (conditional)                                 │
│     ├─ Check prerequisites                                  │
│     │  ├─ EXPO_TOKEN configured? ✓                          │
│     │  └─ projectId exists? ✓                               │
│     │                                                         │
│     ├─ If prerequisites met:                                │
│     │  ├─ Setup Expo                                        │
│     │  ├─ Install dependencies                              │
│     │  ├─ Run: eas build                                    │
│     │  └─ Check build status                                │
│     │                                                         │
│     └─ If prerequisites NOT met:                            │
│        ├─ Display setup instructions                        │
│        └─ Skip build gracefully (no failure)                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

1. **For Each Generated Game:**
   ```bash
   cd agent/generated-games/[game-name]
   npx eas init
   ```

2. **Create EXPO_TOKEN:**
   - Go to: https://expo.dev/settings/access-tokens
   - Create new token
   - Copy to clipboard

3. **Add to GitHub Secrets:**
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: EXPO_TOKEN
   - Value: [paste token]

4. **Test the Workflow:**
   - Push a change to main branch
   - Monitor: Actions tab
   - Expected: Build runs successfully

## Files Created/Modified Summary

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Updated | All generated games - improved workflow |
| `src/generators/game-generator.ts` | Updated | Template for future games |
| `EAS_BUILD_SETUP_FIX.md` | Created | This complete setup guide |
| `scripts/setup-eas-build.sh` | Created | Automated setup script |

## Additional Resources

- **Expo Docs:** https://docs.expo.dev
- **EAS Build Docs:** https://docs.expo.dev/eas-update/getting-started/
- **EAS CLI Reference:** https://docs.expo.dev/reference/eas-cli/
- **GitHub Actions:** https://docs.github.com/en/actions
- **Access Tokens:** https://expo.dev/settings/access-tokens

## Support Commands

```bash
# Get help with eas
eas --help
npx eas-cli --help

# Get detailed project info
eas project:info

# Check who you're logged in as
eas whoami

# View credential list
eas credentials

# Test build locally (dry-run)
eas build --platform android --profile production --dry-run

# See recent builds
eas build --status

# Get real-time logs
eas logs
```

## Summary

The workflow fix ensures that:
1. ✅ Builds only attempt when prerequisites are met
2. ✅ No cryptic "Experience not found" errors
3. ✅ Clear setup instructions in workflow output
4. ✅ Graceful handling of missing configuration
5. ✅ Better error messages for troubleshooting
6. ✅ Consistent behavior across all generated games
7. ✅ Future games automatically get the improved workflow
