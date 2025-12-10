# Expo EAS Build Workflow - Visual Guide

## The Error You Were Getting

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ Tests pass                                               │
│  ✓ Setup Expo                                               │
│  ✓ Install dependencies                                     │
│  ✗ Run: eas build                                           │
│    └─ Experience with id 'xxxxx' does not exist           │
│    └─ Error: GraphQL request failed                        │
│    └─ Request ID: cea1e02e-6491-4ddf-a4be-026988f18eb3  │
│    └─ ❌ BUILD FAILED                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Why It Was Happening

```
┌──────────────────┐
│ Game Generator   │
│  (your agent)    │
└────────┬─────────┘
         │
         v
    Generate random UUID
    (e.g., "1b421672-...")
         │
         v
┌─────────────────────────────────┐
│  app.json                       │
│  "projectId": "1b421672-..."    │
│  (Project doesn't exist!)       │
└──────────┬──────────────────────┘
           │
           v
┌──────────────────────────────────────────┐
│  GitHub Actions Tries to Build          │
│  ├─ Reads projectId from app.json       │
│  ├─ Calls Expo API with projectId       │
│  └─ ERROR: Project not found!          │
│     └─ "Experience ... does not exist"  │
└──────────────────────────────────────────┘
```

## The Fix

### Before: Broken Workflow
```yaml
build:
  steps:
    - Setup Expo
    - Install dependencies
    - Run: eas build
      # ❌ No validation before building
      # ❌ Fails if projectId doesn't exist
      # ❌ No helpful error message
```

### After: Robust Workflow
```yaml
build:
  steps:
    - Check prerequisites        # ← NEW!
      ├─ EXPO_TOKEN exists?       
      └─ projectId is valid?      
    
    - If prerequisites met:
      ├─ Setup Expo              
      ├─ Install dependencies    
      ├─ Run: eas build          # ← Only if valid
      └─ Check result            
    
    - If prerequisites missing:
      └─ Show setup instructions  # ← NEW!
```

## The New Workflow Flow

```
                    START
                     │
                     v
            ┌─────────────────┐
            │  Test Job       │
            │  ├─ npm ci      │
            │  ├─ npm test    │
            │  └─ npm lint    │
            └────────┬────────┘
                     │
                     v
          ┌──────────────────────┐
          │  Check Prerequisites │
          └──────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         v                       v
    YES: All Met           NO: Missing
    ┌──────────────┐      ┌──────────────┐
    │ Setup Expo   │      │ Display Tips │
    │ Install deps │      │ Skip Build   │
    │ Build App    │      │ (No failure) │
    │ Verify build │      └──────────────┘
    └──────┬───────┘            │
           │                    │
           v                    v
      ┌─────────┐          ┌─────────┐
      │ SUCCESS │          │ SKIPPED │
      └─────────┘          └─────────┘
```

## The Setup Process

```
┌─────────────────────────────────────────────────────┐
│              Your Development Flow                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Step 1: Terminal                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ $ npx eas init                              │    │
│  │ ✓ Create Expo project                       │    │
│  │ ✓ Update app.json with real projectId       │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Step 2: Browser                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ https://expo.dev/settings/access-tokens      │   │
│  │ ✓ Create new token                           │   │
│  │ ✓ Copy token to clipboard                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  Step 3: GitHub                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Settings → Secrets → New repository secret   │   │
│  │ ✓ Name: EXPO_TOKEN                           │   │
│  │ ✓ Paste token value                          │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  Step 4: Terminal                                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ $ git push origin main                       │   │
│  │ ✓ Trigger GitHub Actions                     │   │
│  │ ✓ Watch workflow run                         │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## Before vs After

### BEFORE ❌
```
GitHub Actions Workflow:
  1. Try to build
  2. Error: "Experience not found"
  3. ❌ BUILD FAILED
  4. ❌ No clear reason
  5. ❌ No instructions
```

### AFTER ✅
```
GitHub Actions Workflow:
  1. Check prerequisites
  2. EXPO_TOKEN? ✓ Configured
  3. projectId? ✓ Valid
  4. Build successfully ✓
  5. ✓ Or skip gracefully if incomplete
  6. ✓ Clear instructions if setup needed
```

## Configuration Structure

### What Gets Created

```
Your Game Directory/
├── app.json
│   └── "extra": {
│         "eas": {
│           "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← Real UUID!
│         }
│       }
├── eas.json
│   └── "cli": {
│         "version": ">= 5.0.0"
│       },
│       "build": {...}
├── .github/workflows/
│   └── ci.yml  ← Updated workflow
└── [other files]
```

## The Validation Chain

```
┌─────────────────────────────────────┐
│  Workflow Starts (on push to main)  │
└────────────┬────────────────────────┘
             │
             v
┌─────────────────────────────────────┐
│  Step: Check Prerequisites          │
├─────────────────────────────────────┤
│                                      │
│  Is EXPO_TOKEN secret configured?   │
│  ├─ YES → Continue ✓                │
│  └─ NO  → Skip build & show tips ⚠  │
│                                      │
│  Does projectId exist in app.json?  │
│  ├─ YES → Continue ✓                │
│  └─ NO  → Skip build & show tips ⚠  │
│                                      │
│  Both valid?                         │
│  ├─ YES → Proceed to build ✓        │
│  └─ NO  → Show setup instructions ⚠ │
│                                      │
└─────────────────────────────────────┘
```

## Error Resolution Map

```
                        Build Fails
                            │
                ┌───────────┼───────────┐
                │           │           │
                v           v           v
        "Experience"   "EXPO_TOKEN"  "Other"
        "not found"    "invalid"     "error"
                │           │           │
                v           v           v
        ┌────────────┐  ┌─────────┐  ┌──────┐
        │ Fix:       │  │ Fix:    │  │ Fix: │
        │            │  │         │  │      │
        │npx eas     │  │ Recreate│  │Check │
        │init        │  │ token   │  │logs  │
        │            │  │ at:     │  │      │
        │Gets real   │  │expo.dev │  │      │
        │projectId   │  │         │  │      │
        └────────────┘  └─────────┘  └──────┘
```

## File Changes Overview

```
┌──────────────────────────────────────────────────────┐
│              Files Modified/Created                   │
├──────────────────────────────────────────────────────┤
│                                                        │
│  ✏️  Updated Workflows (6 files):                    │
│     └─ All generated games ci.yml                    │
│                                                        │
│  ✏️  Updated Generator (1 file):                     │
│     └─ agent/src/generators/game-generator.ts        │
│                                                        │
│  📄 Created Documentation (3 files):                 │
│     ├─ EAS_BUILD_SETUP_FIX.md                        │
│     ├─ EAS_WORKFLOW_FIX_SUMMARY.md                   │
│     └─ EAS_QUICK_START.md                            │
│                                                        │
│  🔧 Created Scripts (1 file):                        │
│     └─ scripts/setup-eas-build.sh                    │
│                                                        │
└──────────────────────────────────────────────────────┘
```

## Quick Decision Tree

```
                    Ready to build?
                          │
                ┌─────────┴─────────┐
                │                   │
         Have Expo account?    NO → Create at expo.dev
         │
    YES │
         │
         v
    Have projectId?    NO → Run: npx eas init
         │
    YES │
         │
         v
    Have EXPO_TOKEN?   NO → Create at expo.dev/settings
         │
    YES │
         │
         v
    Added to GitHub?   NO → Settings → Secrets → Add
         │
    YES │
         │
         v
    ✓ Ready to build!
      Push code → Workflow runs → App built
```

## Success Indicators

### ✅ Everything Configured
```
GitHub Actions:
  ✓ Tests pass
  ✓ Build starts
  ✓ Build completes
  ✓ Success message
```

### ⚠️ Incomplete Setup (No Failure)
```
GitHub Actions:
  ✓ Tests pass
  ✓ Build SKIPPED (intentional)
  ⚠ Setup instructions shown
  ✓ Workflow completes (not failed)
```

### ❌ Setup Complete but Token Invalid
```
GitHub Actions:
  ✓ Tests pass
  ✓ Prerequisites check passes
  ✓ Build starts
  ❌ GraphQL error (invalid token)
  ✓ Clear error message shown
```

## Support Resources

```
┌─────────────────────────────────────┐
│     Where to Find Help              │
├─────────────────────────────────────┤
│                                      │
│ 📖 Documentation:                   │
│   ├─ EAS_BUILD_SETUP_FIX.md          │
│   ├─ EAS_WORKFLOW_FIX_SUMMARY.md     │
│   └─ EAS_QUICK_START.md              │
│                                      │
│ 🔧 Automation:                      │
│   └─ scripts/setup-eas-build.sh      │
│                                      │
│ 🌐 External:                        │
│   ├─ https://docs.expo.dev           │
│   ├─ https://expo.dev/settings       │
│   └─ GitHub Actions logs             │
│                                      │
└─────────────────────────────────────┘
```

---

**The workflow is now smarter, more helpful, and more resilient!** 🚀
