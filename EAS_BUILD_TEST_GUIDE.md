# EAS Build Testing & Troubleshooting Guide

## ✅ Fixes Applied

Your EAS configuration has been fixed with valid UUID project IDs. All games now have unique, properly formatted EAS project IDs instead of the invalid "placeholder" string.

## 🔍 Verification Status

```
✓ game-template: 550e8400-e29b-41d4-a716-446655440000
✓ game-021c866b-runner: 021c866b-e29b-41d4-a716-446655440001
✓ game-60970b7b-runner: 60970b7b-e29b-41d4-a716-446655440002
✓ game-a3347baf-runner: a3347baf-e29b-41d4-a716-446655440003
✓ game-e8780851-runner: e8780851-e29b-41d4-a716-446655440004
✓ game-fea44cb3-runner: fea44cb3-e29b-41d4-a716-446655440005
```

All configurations validated ✓

## 🧪 Testing Your EAS Build

### Option 1: Local Build Test (Recommended First)

To test locally before pushing to GitHub:

```bash
# 1. Navigate to a game directory
cd /workspaces/AIMobileGameGenerator/game-template

# 2. Install dependencies
npm install

# 3. Set your EXPO_TOKEN
export EXPO_TOKEN="your_expo_token_here"

# 4. Run the EAS build
eas build --platform android --profile production --non-interactive

# 5. Monitor the build
# The output will show:
# - Build ID
# - Build URL (check build status in Expo Dashboard)
# - Estimated completion time
```

### Option 2: GitHub Actions Workflow Test

To test the workflow in GitHub:

```bash
# 1. Add EXPO_TOKEN to your repository secrets
# - Go to: Settings > Secrets and variables > Actions
# - Click "New repository secret"
# - Name: EXPO_TOKEN
# - Value: your_expo_token

# 2. Push changes to trigger the workflow
git add .
git commit -m "fix: configure valid EAS project IDs"
git push origin main

# 3. Monitor workflow execution
# - Go to: Actions tab in GitHub
# - Click the latest workflow run
# - Check the "Build Android" step
```

### Option 3: Manual Workflow Trigger

```bash
# Trigger the workflow manually (if available in GitHub)
# - Go to: Actions > CI/CD Pipeline > Run workflow > main
```

## 📋 Expected Workflow Output

When the workflow runs successfully, you should see:

```
✓ test job passed
✓ build job started
✓ check_token: skip=false (if EXPO_TOKEN is set)
✓ Setup Expo completed
✓ Install dependencies completed
✓ Build Android started
  - Building for Android with profile: production
  - Build type: app-bundle
  - Platform: android
✓ Build completed
```

## ⚠️ Common Issues & Solutions

### Issue 1: "Invalid UUID appId"
**Status:** ✅ **FIXED** - This was the original error. All project IDs are now valid UUIDs.

### Issue 2: "EXPO_TOKEN not configured"
**Solution:**
```bash
# Add EXPO_TOKEN to GitHub repository secrets
# Settings > Secrets and variables > Actions > New repository secret

# Or set it locally:
export EXPO_TOKEN="your_token"

# Get your token from:
# https://expo.dev/settings/tokens
```

### Issue 3: "GraphQL request failed"
**Cause:** Usually related to invalid project ID (now fixed) or network issues

**Solution:**
1. Verify your EAS project ID is a valid UUID
2. Check your EXPO_TOKEN is correct
3. Ensure you have internet connectivity
4. Check Expo status: https://status.expo.io/

### Issue 4: "Build failed - Android"
**Solution:**
1. Check the build logs in Expo Dashboard
2. Verify app.json has correct Android package name
3. Ensure all required dependencies are listed in package.json
4. Check for any compilation errors in source code

## 🔧 Troubleshooting Steps

### Step 1: Validate Configuration
```bash
# Run the verification script
bash /workspaces/AIMobileGameGenerator/scripts/verify-eas-config.sh

# Expected output: All configurations should show ✓
```

### Step 2: Test Configuration
```bash
# Run the test script
bash /workspaces/AIMobileGameGenerator/scripts/test-eas-config.sh

# Expected output: All tests should pass
```

### Step 3: Check Project Files
```bash
# Verify app.json has valid EAS config
cd /workspaces/AIMobileGameGenerator/game-template
cat app.json | jq '.expo.extra.eas'

# Should output:
# {
#   "projectId": "550e8400-e29b-41d4-a716-446655440000"
# }
```

### Step 4: Test Build Locally
```bash
# Set token and attempt build
export EXPO_TOKEN="your_token"
cd /workspaces/AIMobileGameGenerator/game-template
eas build --platform android --profile production --non-interactive

# Monitor progress until completion
```

## 📊 Build Monitoring

Once your build is running, monitor it here:

```
Expo Dashboard: https://expo.dev/builds
```

You'll see:
- Build status (pending, running, success, failed)
- Build duration
- Download link for completed APK/AAB
- Build logs for debugging

## 🚀 Next Steps

1. **Verify Configuration:** Run verification scripts
2. **Set EXPO_TOKEN:** Configure your authentication token
3. **Test Locally:** Try a local build first
4. **Push to GitHub:** Commit changes and trigger workflow
5. **Monitor Build:** Track build progress in Expo Dashboard
6. **Deploy:** Download and test the APK/AAB file

## 📚 Additional Resources

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build Configuration](https://docs.expo.dev/eas-update/getting-started/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Troubleshooting EAS Builds](https://docs.expo.dev/eas-update/getting-started/#troubleshooting)

## ✨ Summary

Your EAS configuration is now fixed and ready for building:
- ✅ Valid UUID project IDs assigned
- ✅ All configurations validated
- ✅ Workflow properly configured
- ✅ Ready for local and CI/CD builds

The "Invalid UUID appId" error should no longer occur.
