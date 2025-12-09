# Workflows Guide

Common workflows for the AI Mobile Game Generator.

## Table of Contents

1. [Generate a Single Game](#generate-a-single-game)
2. [Generate 10 Games](#generate-10-games)
3. [Deploy Games](#deploy-games)
4. [Analyze Performance](#analyze-performance)
5. [Extend Winner Game](#extend-winner-game)
6. [Sunset Underperforming Games](#sunset-underperforming-games)

---

## Generate a Single Game

### Interactive Mode (Recommended for First Time)

```bash
cd agent
npm run dev -- generate-game --interactive
```

You'll be prompted for:
- Game name
- Game type (runner, platformer, puzzle, etc.)
- Theme
- Mechanics

### Command Line Mode

```bash
npm run dev -- generate-game \
  --name "Space Runner" \
  --type runner \
  --theme "Space adventure" \
  --mechanics "jump, collect stars, avoid asteroids"
```

### What Happens

1. AI generates game code based on your inputs
2. Creates GitHub repository
3. Commits code with proper structure
4. Adds CI/CD workflow
5. Pushes to GitHub
6. Returns game ID and repo URL

### Example Output

```
🎮 Starting game generation...

[1/7] Generating game code with AI
[2/7] Creating project from template
[3/7] Applying generated code
[4/7] Updating configuration
[5/7] Creating GitHub repository
[6/7] Adding CI/CD workflow
[7/7] Pushing to GitHub

✅ SUCCESS!

Game ID: a1b2c3d4
Repository: https://github.com/yourorg/game-a1b2c3d4-runner

Next steps:
  1. Review the code at https://github.com/yourorg/game-a1b2c3d4-runner
  2. Deploy: npm run deploy -- --game a1b2c3d4
```

---

## Generate 10 Games

Create a batch script to generate multiple games:

### Create `generate-batch.sh`

```bash
#!/bin/bash

# Array of game configurations
games=(
  "Space Runner|runner|Dodge asteroids in space|jump, collect, dodge"
  "Ninja Jump|platformer|Ninja climbing adventure|climb, jump, attack"
  "Gem Match|match3|Match colorful gems|match, swap, combo"
  "Sky Racer|racing|High-speed aerial racing|steer, boost, overtake"
  "Tower Defense|strategy|Defend your castle|place towers, upgrade, strategy"
  "Bubble Pop|casual|Pop colorful bubbles|aim, shoot, pop"
  "Zombie Escape|runner|Run from zombie horde|run, jump, collect weapons"
  "Puzzle Master|puzzle|Brain-teasing puzzles|solve, rotate, match"
  "Fruit Ninja Clone|arcade|Slice flying fruits|swipe, slice, combo"
  "Candy Crush Lite|match3|Sweet matching game|match, cascade, special candy"
)

cd agent

for game in "${games[@]}"; do
  IFS='|' read -r name type theme mechanics <<< "$game"
  
  echo "Generating: $name"
  npm run dev -- generate-game \
    --name "$name" \
    --type "$type" \
    --theme "$theme" \
    --mechanics "$mechanics"
  
  # Wait a bit to avoid rate limits
  sleep 10
done

echo "All games generated!"
```

### Run the batch

```bash
chmod +x generate-batch.sh
./generate-batch.sh
```

### Monitor Progress

```bash
cd agent
npm run dev -- list-games
```

---

## Deploy Games

### Deploy Single Game

```bash
cd agent
npm run dev -- deploy-game --game a1b2c3d4
```

### What Happens

1. Runs unit tests
2. If tests fail, AI attempts to fix
3. Triggers EAS build (Android AAB)
4. Submits to Google Play (internal track)
5. Updates game status to "live"

### Deploy All Games

Create `deploy-all.sh`:

```bash
#!/bin/bash

cd agent

# Get list of games
games=$(npm run dev -- list-games | grep -oP '^\w{8}')

for game_id in $games; do
  echo "Deploying: $game_id"
  npm run dev -- deploy-game --game "$game_id"
  
  # Wait between deployments
  sleep 30
done
```

### Monitor Deployments

Check GitHub Actions for each repo:
- Visit: `https://github.com/yourorg/game-xxxxx-type/actions`
- Monitor build status
- Check EAS dashboard: `https://expo.dev`

---

## Analyze Performance

Wait 30-60 days after deployment to gather meaningful data.

### Run Analysis

```bash
cd agent
npm run dev -- analyze-performance --days 30
```

### Output

```
📊 Analyzing game performance...

=== Performance Analysis Report ===

Game Rankings:
────────────────────────────────────────────────────────────────────────────────
Rank | Game ID           | Score  | Installs | 7d Ret | ARPDAU  | Crashes
────────────────────────────────────────────────────────────────────────────────
   1 | game-03-match3    |  85.32 |     5420 |  35.2% | $0.085  |   1.2%
   2 | game-01-runner    |  72.18 |     3890 |  28.5% | $0.062  |   2.1%
   3 | game-07-zombie    |  68.45 |     3210 |  22.8% | $0.071  |   1.8%
   4 | game-02-ninja     |  54.22 |     1950 |  18.3% | $0.048  |   3.5%
   5 | game-05-tower     |  48.90 |     1420 |  15.2% | $0.055  |   2.7%
...
────────────────────────────────────────────────────────────────────────────────

🏆 Winner: game-03-match3 (Score: 85.32)

Recommendations:
  1. Winner: game-03-match3 with score 85.32
  2. Winner has excellent retention - focus on monetization optimization
  3. Consider A/B testing features between top performers: game-03-match3, game-01-runner, game-07-zombie
  4. Sunset low performers: game-08-puzzle, game-09-fruit, game-10-candy
  5. Extend game-03-match3 with 10 additional levels and enhanced features

Next steps:
  1. Run: npm run extend -- --game game-03-match3 --levels 10
  2. Run: npm run sunset -- --exclude game-03-match3
```

### Export Analysis

Analysis is automatically saved to:
```
generated-games/analysis-YYYY-MM-DD.json
```

---

## Extend Winner Game

Once you've identified the winner, add more content:

```bash
cd agent
npm run dev -- extend-game --game game-03-match3 --levels 10
```

### What Happens

1. AI analyzes existing levels
2. Generates 10 new levels with:
   - Progressive difficulty
   - New mechanics
   - Varied challenges
3. Creates a new branch: `feature/add-10-levels`
4. Commits changes
5. Creates Pull Request
6. You review and merge manually

### Review the PR

1. Visit the PR URL (shown in output)
2. Review generated levels
3. Test locally if needed:
   ```bash
   cd generated-games/game-03-match3
   git checkout feature/add-10-levels
   npm start
   ```
4. Merge PR if satisfied

### Deploy Extended Version

After merging:
```bash
npm run dev -- deploy-game --game game-03-match3
```

---

## Sunset Underperforming Games

Remove games that didn't perform well:

### Sunset All Except Winner

```bash
cd agent
npm run dev -- sunset-games --exclude game-03-match3
```

### Confirmation

You'll be asked to confirm:
```
🌅 Sunsetting games...

? This will archive all games except the excluded one. Continue? (y/N)
```

### What Happens

1. Archives GitHub repositories (read-only)
2. Marks games as "sunset" in database
3. Optionally unpublishes from Play Store (manual confirmation required)

### Manual Play Store Cleanup

For each sunset game:
1. Go to Play Console
2. Select the app
3. Navigate to Production → Release
4. Deactivate release
5. Or keep it live but stop promoting

---

## Advanced Workflows

### A/B Testing Top Performers

Create variants of top 3 games:

```bash
# Generate variant with different mechanics
npm run dev -- generate-game \
  --name "Match3 Mega - Variant A" \
  --type match3 \
  --theme "Enhanced power-ups and combos" \
  --mechanics "match, power-up combos, chain reactions"
```

### Continuous Monitoring

Set up cron job for daily analysis:

```bash
# Add to crontab
0 2 * * * cd /path/to/agent && npm run dev -- analyze-performance --days 7 >> logs/daily-analysis.log 2>&1
```

### Automated Deployment Pipeline

For fully automated workflow:

1. Generate 10 games
2. Deploy all automatically
3. Wait 30 days
4. Auto-analyze
5. Auto-extend winner
6. Manual review before sunset

### Marketing Integration

Track external metrics:

```bash
# Export analytics for marketing team
npm run dev -- analyze-performance --days 30 --export analytics.json

# Share with marketing
cat generated-games/analysis-YYYY-MM-DD.json | jq '.games[] | {id, installs, retention7Day}'
```

---

## Tips & Best Practices

### Game Generation

1. **Be specific with themes**
   - Good: "Underwater adventure with sea creatures"
   - Bad: "Fun game"

2. **Limit mechanics to 3-5**
   - More focused = better implementation

3. **Test manually before deploying**
   - Generate 1-2 test games first
   - Verify quality

### Deployment

1. **Start with internal testing**
   - Deploy to internal track first
   - Test thoroughly
   - Promote to production

2. **Monitor build failures**
   - Check GitHub Actions
   - Review EAS logs
   - Fix issues before bulk deployment

### Analysis

1. **Wait for sufficient data**
   - Minimum 1000 installs per game
   - At least 30 days of data

2. **Consider multiple metrics**
   - Don't rely only on installs
   - Retention is crucial
   - Monetization matters

### Extension

1. **Review AI-generated content**
   - Always test new levels
   - Ensure difficulty curve

2. **Incremental updates**
   - Add 10 levels at a time
   - Monitor performance after each update

---

## Troubleshooting

### Game Generation Fails

```bash
# Check AI service
curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY"

# Check GitHub API
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Deployment Fails

```bash
# Check EAS status
eas build:list --limit 10

# View build logs
eas build:view <build-id>
```

### Analysis Returns No Data

- Verify games are actually deployed
- Check Google Play API access
- Ensure sufficient time has passed

---

## Next Steps

1. Start with generating 1-2 test games
2. Deploy and test the workflow
3. Generate remaining 8 games
4. Set up monitoring
5. Wait for data collection period
6. Analyze and optimize
