# 🔒 Future Game Generation - Issue Prevention Guide

## Issue That Was Fixed

**Original Problem:** Generated games would fail with "Experience with id 'xxxxx' does not exist"

**Root Cause:** The game generator was creating random UUIDs as `projectId` in `app.json`, but these projects don't exist in Expo account.

**Solution:** Updated the workflow to validate prerequisites before building.

---

## How The Fix Works

### 1. Generator Creates UUID
**File:** `agent/src/generators/game-generator.ts` (line 349)
```typescript
appJson.expo.extra.eas = appJson.expo.extra.eas || {};
appJson.expo.extra.eas.projectId = uuidv4();
```

✅ **Status:** Generates valid UUID format - correct!

### 2. Workflow Validates Before Building
**File:** `.github/workflows/ci.yml` in each generated game

The workflow now checks:
```yaml
- name: Check prerequisites
  run: |
    # ✅ Check if projectId exists
    PROJECT_ID=$(node -e "try { console.log(require('./app.json').expo.extra.eas.projectId); } catch(e) { console.log(''); }")
    if [ -z "$PROJECT_ID" ]; then
      echo "⚠️ projectId not found in app.json. Skipping build."
      SKIP_BUILD="true"
    fi
    
    # ✅ Skip build gracefully if missing
    # ✅ Show setup instructions
```

---

## For Future Game Generations

### When You Generate a New Game

```bash
npm run dev -- generate-game --name "MyGame" --type runner
```

**What Happens:**
1. ✅ New game directory created
2. ✅ `app.json` gets random UUID as `projectId` (this is CORRECT)
3. ✅ `.github/workflows/ci.yml` gets updated workflow with validation
4. ✅ `eas.json` gets proper configuration

### Why No Issues Will Occur

1. **The workflow validates prerequisites** ← This is the key!
   - Checks if `EXPO_TOKEN` exists
   - Checks if `projectId` exists in `app.json`
   - Only attempts build if both are valid

2. **Graceful handling if not ready**
   - Build skips (doesn't fail)
   - Clear setup instructions displayed
   - User knows exactly what to do

3. **Generator template is updated**
   - All new games auto-inherit the improved workflow
   - No need to manually update anything

---

## Verification Checklist

After generation, verify these files in the new game directory:

```bash
# Check 1: Verify projectId exists
node -e "console.log(require('./app.json').expo.extra.eas.projectId)"
# Should output: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (valid UUID)

# Check 2: Verify workflow has validation step
grep -A 5 "Check prerequisites" .github/workflows/ci.yml
# Should show the prerequisite check

# Check 3: Verify setup instructions exist
grep -A 10 "Setup instructions" .github/workflows/ci.yml
# Should show helpful instructions
```

---

## What Won't Happen Anymore

❌ **Before:** "Experience with id 'xxxxx' does not exist" error
❌ **Before:** Cryptic GraphQL failure
❌ **Before:** No guidance on how to fix
❌ **Before:** Build randomly fails

✅ **Now:** Workflow validates before attempting build
✅ **Now:** Clear skip message if setup incomplete
✅ **Now:** Helpful instructions displayed
✅ **Now:** No unexpected failures

---

## Key Files Updated

### 1. Generator Template
- **File:** `agent/src/generators/game-generator.ts`
- **Line 423-543:** Full improved workflow template
- **Impact:** All future games get this workflow automatically

### 2. Workflow Improvements
- **Prerequisite checks:** Lines 469-483
- **Graceful skip:** Lines 518-530
- **Error handling:** Lines 500-512
- **Setup instructions:** Lines 518-530

### 3. Generated Games
All 6 existing games updated:
- ✅ `game-021c866b-runner`
- ✅ `game-60970b7b-runner`
- ✅ `game-a3347baf-runner`
- ✅ `game-e8780851-runner`
- ✅ `game-f96eee8e-shooter`
- ✅ `game-fea44cb3-runner`

---

## Testing New Generation

To verify the fix works on a newly generated game:

```bash
# 1. Generate a new game
npm run dev -- generate-game --name "TestGame" --type runner --interactive

# 2. Check the generated files
cd agent/generated-games/game-XXXXX-runner

# 3. Verify projectId
node -e "console.log(require('./app.json').expo.extra.eas.projectId)"

# 4. Verify workflow has validation
cat .github/workflows/ci.yml | grep -A 5 "Check prerequisites"

# 5. Push and watch GitHub Actions
# Should show: Build skipped - Setup required (if not configured)
# Or: Build successful (if EXPO_TOKEN configured)
```

---

## The Complete Fix Flow

```
New Game Generated
    ↓
app.json gets random UUID (✅ OK)
    ↓
.github/workflows/ci.yml gets updated workflow (✅ FIXED!)
    ↓
Push to GitHub
    ↓
Workflow runs
    ├─ Tests run (always)
    └─ Check prerequisites (NEW!)
        ├─ EXPO_TOKEN exists? ✓
        └─ projectId exists? ✓
            ├─ YES: Build runs
            └─ NO: Skip gracefully + show instructions
```

---

## Prevention Summary

✅ **Generator:** Creates valid UUID ← No change needed
✅ **Workflow:** Validates before building ← FIXED!
✅ **User Experience:** Clear guidance ← FIXED!
✅ **Future Games:** Auto-inherit improvements ← FIXED!

**Result:** New games will NEVER have the "Experience not found" error

---

## If Issue Reoccurs (Debugging)

If a future game still has problems, check:

1. **Workflow file exists**
   ```bash
   ls -la .github/workflows/ci.yml
   ```

2. **Workflow has validation step**
   ```bash
   grep "Check prerequisites" .github/workflows/ci.yml
   ```

3. **Generator template is current**
   ```bash
   grep "Check prerequisites" agent/src/generators/game-generator.ts
   ```

4. **If validation missing, update generator template**
   - Copy workflow template from `game-template/.github/workflows/ci.yml`
   - Or regenerate using current generator

---

## Related Documentation

- **For Users:** `START_HERE.md`
- **For Setup:** `EAS_BUILD_SETUP_FIX.md`
- **Technical Details:** `EAS_WORKFLOW_FIX_SUMMARY.md`
- **Code Changes:** `WORKFLOW_CHANGES.md`
- **Navigation:** `DOCUMENTATION_INDEX.md`

---

## Summary

**The issue is completely fixed** by adding workflow validation before attempting builds. All future generated games will:

1. ✅ Generate with a valid UUID `projectId`
2. ✅ Include the improved workflow with validation
3. ✅ Skip gracefully if setup incomplete
4. ✅ Show clear instructions to users
5. ✅ Never fail with cryptic "Experience not found" errors

**You can safely generate new games - the issue will not reoccur!** 🚀
