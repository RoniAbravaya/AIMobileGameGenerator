# Known Limitations & Design Decisions

**Last Updated**: December 9, 2025

## Overview

This document outlines the current limitations, design decisions, and trade-offs in the AI Mobile Game Generator system.

---

## Development vs Production

### Monetization (AdMob & IAP)

**Limitation**: Ads and In-App Purchases are **mocked** in development mode (Expo Go)

**Reason**: AdMob (`react-native-google-mobile-ads`) and IAP (`react-native-iap`) require native modules that don't work in Expo Go.

**Workaround**:
- Development/Testing: Uses mock implementations that log to console
- Production: Create a custom development build with EAS:
  ```bash
  eas build --platform android --profile development
  ```

**Impact**: 
- ✅ Can test game logic in Expo Go
- ❌ Cannot test actual ads/purchases without custom build
- ✅ Production builds work fine with real monetization

---

## AI Generation

### Image Generation

**Limitation**: Requires OpenAI API key and costs ~$0.08 per game

**Reason**: DALL-E 3 API charges per image generation

**Workaround**:
- Leave `IMAGE_API_KEY` unconfigured → uses placeholder images
- Or configure API key → generates unique splash screens

**Fallback Strategy**:
- If API fails or not configured: Creates simple colored placeholder PNGs
- Games still work with placeholders
- Can manually replace images later

### Code Generation

**Limitation**: AI-generated game code may need manual review/fixes

**Reason**: LLMs occasionally produce code with minor issues

**Workaround**:
- Self-healing: Agent attempts to fix test/build failures automatically (max 3 attempts)
- Manual review: Check generated code before deploying
- Iteration: Re-generate if quality is poor

**Best Practice**:
- Test locally with `npm start` before deploying
- Review GitHub repo after generation
- Run tests: `npm test`

---

## Game Templates

### Game Type Implementations

**Current State**:
- ✅ Runner: Fully playable (3-lane dodging, obstacles, coins)
- ✅ Puzzle: Fully playable (match-3, swap mechanics)
- ✅ Word: Playable (letter grid, word formation)
- ✅ Card: Playable (simple Pazaak-style duel)
- ✅ Platformer: Playable (jump physics, platform navigation)

**Limitations**:
- Game engines are intentionally simple to keep generation reliable
- Advanced features (power-ups, combos, enemies) would require more complex prompts
- Physics are basic (good enough for casual mobile games)

**Future Enhancements**:
- More sophisticated game mechanics
- Multiplayer support
- Backend leaderboards
- More game types (shooter, racing, strategy)

### Level System

**Design Decision**: 10 levels total, 3 playable on launch

**Reason**: MVP experimentation strategy
- Launch fast with minimal content
- Identify winner based on 3-level experience
- Extend winner with full 10 levels

**Limitation**: Cannot test levels 4-10 until extended

**Workaround**:
- Level config already defines all 10
- Extension workflow just flips `isPlayable` flags
- AI can generate level-specific content when extending

---

## Platform Support

### Android Only

**Limitation**: Currently targets Android only

**Reason**: Focus on single platform for MVP

**iOS Support**:
- Template is iOS-compatible (React Native/Expo)
- Would need:
  - App Store Developer account ($99/year)
  - App Store submission workflow
  - App Store API integration in agent
- Estimated effort: 1-2 weeks

### Web Support

**Status**: Basic web support via Expo web

**Limitations**:
- Game controls may not translate well (mobile-first design)
- AdMob doesn't work on web
- IAP doesn't work on web

**Use Case**: Useful for quick testing, not production

---

## Deployment & CI/CD

### First-Time App Submission

**Limitation**: Initial Google Play submission requires manual steps

**Reason**: Google Play Console requires:
- Content rating questionnaire (interactive form)
- Privacy policy (legal review needed)
- Store listing assets (screenshots, descriptions)
- Manual app creation

**Automated Part**:
- Subsequent updates (after first submission)
- Build generation
- APK/AAB upload
- Version management

**Timeline**:
- First app: 1-2 hours manual work
- Subsequent apps: Can be automated after template created

### Build Times

**Typical Times**:
- EAS build (Android): 10-20 minutes
- Test suite: 1-2 seconds
- Image generation: 30-60 seconds (if configured)
- Full workflow: 15-30 minutes per game

**Bottleneck**: EAS build queue (can parallelize with paid plan)

---

## Testing

### Unit Tests Only

**Current Coverage**:
- ✅ Level configuration
- ✅ Game type system
- ✅ Monetization config
- ✅ Game logic (scoring, unlock)

**Not Covered**:
- ❌ E2E tests (Detox/Appium)
- ❌ Visual regression tests
- ❌ Performance tests
- ❌ Integration tests for full agent workflow

**Reason**: E2E tests are complex to set up and maintain

**Recommendation**: Manual testing for MVP, add E2E later if needed

---

## Analytics & Metrics

### Google Play API Limitations

**Current Implementation**: Stub/placeholder

**Reason**: Google Play Developer API has limited metrics access

**Full Analytics Requires**:
- Firebase Analytics integration
- BigQuery exports
- Custom backend for aggregation

**Current Workaround**:
- Manual checking of Play Console
- Export data manually for analysis

**Future**: Integrate Firebase Analytics SDK

---

## Security & Secrets

### Service Account Keys

**Limitation**: Service account JSON must be manually secured

**Best Practices**:
- ✅ Never commit to git (.gitignored)
- ✅ Store in `secrets/` folder
- ✅ Use GitHub Secrets for CI/CD
- ⚠️ Rotate every 90 days

### API Key Management

**Risk**: Agent has access to all API keys

**Mitigation**:
- Run agent in secure environment
- Use minimal-scope tokens
- Monitor API usage
- Separate dev/prod credentials

---

## Cost & Scaling

### API Costs

**Per Game Generation**:
- Code generation: ~$5-10 (Anthropic API)
- Image generation: ~$0.08 (OpenAI API, optional)
- **Total**: ~$5-10 per game

**10 Games**: ~$50-100 one-time

**Monthly** (assuming no re-generations):
- Expo EAS: $29/month fixed
- API usage: Minimal (only for analysis/extensions)

### Rate Limits

**Potential Bottlenecks**:
- Anthropic API: 50 requests/minute (plenty)
- OpenAI Images: 50 images/minute (plenty)
- GitHub API: 5000 requests/hour (fine for <100 games)
- EAS builds: Queue-based (paid plan for parallel builds)

**Recommendation**: Generate games sequentially to avoid issues

---

## Quality Assurance

### AI-Generated Code Quality

**Consistency**: ~85-90% success rate (AI generates working code)

**Common Issues**:
- Import path errors (self-healing usually fixes)
- TypeScript type mismatches (rare with good prompts)
- Logic bugs (rare, but possible)

**Mitigation**:
- Automated test suite catches most issues
- Self-healing attempts fixes (max 3 retries)
- Manual review before deploy

### Visual Polish

**Generated Games Are**:
- ✅ Playable
- ✅ Functional
- ✅ Visually distinct per type
- ⚠️ Not AAA quality

**Appropriate For**:
- Casual mobile games
- Hyper-casual experiments
- Market testing
- Rapid prototyping

**Not Appropriate For**:
- High-production-value games
- Story-driven experiences
- Competitive multiplayer

---

## Experiment Workflow

### 30-60 Day Timeline

**Required**: Sufficient data for analysis

**Minimum Metrics**:
- 1000+ installs per game
- 7-day retention data
- Revenue data (if monetized)

**If Lower Traffic**:
- Extend experiment window
- Or use proxy metrics (engagement, session length)

### Manual Steps

**Cannot Be Automated**:
1. Initial Play Store submission
2. Marketing campaign execution
3. Ad creative design
4. App Store screenshots
5. Policy violation appeals

**Semi-Automated**:
- Store listing updates (after first submission)
- Metadata changes
- Version updates

---

## Technical Debt

### Known Issues to Address

1. **SDK Version Standardization** - Some files reference SDK 50/52/54 (need consistency)
2. **TypeScript Strictness** - Some `any` types could be stricter
3. **Error Handling** - Could be more granular in some services
4. **Game Engine Polish** - Engines are functional but could use refinement

### Future Refactoring

1. **Backend Integration** - Add optional backend for:
   - Leaderboards
   - Cloud save
   - Analytics aggregation
   - A/B testing

2. **Asset Pipeline** - More sophisticated asset generation:
   - Character sprites
   - Background music
   - Sound effects

3. **Localization** - Multi-language support

---

## Browser Compatibility

### Web Platform

**Status**: Runs in browser via Expo web

**Works**:
- Basic gameplay
- Navigation
- UI rendering

**Doesn't Work**:
- AdMob (web incompatible)
- IAP (web incompatible)
- Some mobile-specific APIs

**Use Case**: Demo/testing only, not production

---

## Recommended Workflow

### For Best Results

1. **Start Small**: Generate 1-2 test games first
2. **Test Locally**: Use Expo Go to verify functionality
3. **Review Code**: Check generated game repo before deploying
4. **Internal Testing**: Deploy to internal track first
5. **Iterate**: Re-generate if quality isn't acceptable
6. **Scale Up**: Once validated, generate remaining games
7. **Monitor**: Track performance during experiment
8. **Analyze**: Wait for sufficient data before selecting winner

### When to Manual Override

- Generated code has bugs → Fix manually and commit
- Image quality poor → Replace with custom assets
- Gameplay needs tuning → Adjust parameters manually
- Store listing rejected → Update metadata manually

---

## Support & Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Solution: Copy `.env.template` to `.env` and fill in values

2. **"EAS build failed"**
   - Check: `eas login` authenticated
   - Check: Valid Expo subscription
   - Review: Build logs on expo.dev

3. **"Tests failing"**
   - Run: `npm install` in game directory
   - Check: All dependencies installed
   - Review: Specific test errors

4. **"Image generation failed"**
   - Check: IMAGE_API_KEY is valid
   - Check: OpenAI account has credits
   - Fallback: Uses placeholder images automatically

### Getting Help

1. Check `docs/SETUP.md` for configuration
2. Check `docs/WORKFLOWS.md` for usage examples
3. Review `IMPLEMENTATION_STATUS.md` for current state
4. Check GitHub Actions logs for build errors
5. Review EAS logs for deployment issues

---

## Conclusion

This system is designed for **rapid mobile game experimentation**, not AAA game development. It trades perfect quality for speed and scale.

**Strengths**:
- Fast iteration (hours, not weeks)
- Low cost (~$5-10 per game)
- Automated deployment
- Data-driven decision making

**Best For**:
- Market testing
- Concept validation
- Hyper-casual game portfolios
- Learning/experimentation

**Not Best For**:
- High-budget productions
- Complex game mechanics
- Story-driven games
- Competitive multiplayer

---

**Questions?** See `docs/SETUP.md` or review the implementation files.
