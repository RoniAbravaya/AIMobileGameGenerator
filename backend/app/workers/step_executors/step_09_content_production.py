"""
Step 9: Content Production

Generates all 10 level configurations with:
- Difficulty progression
- Ad-gated unlock system for levels 4-10
- Level-specific parameters
- Level regression tests
"""

from typing import Any, Dict, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.services.ai_service import get_ai_service
from app.services.github_service import get_github_service
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


class ContentProductionStep(BaseStepExecutor):
    """
    Step 9: Generate all game content (10 levels).
    
    Creates level configurations with proper difficulty curve
    and ad-gated unlock system.
    """

    step_number = 9
    step_name = "content_production"

    def __init__(self):
        super().__init__()
        self.ai_service = get_ai_service()
        self.github_service = get_github_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Generate all level content."""
        self.logger.info("producing_content", game_id=str(game.id))

        logs = []
        logs.append(f"Starting content production for {game.name}")

        try:
            if not game.github_repo:
                return {
                    "success": False,
                    "error": "Missing GitHub repo",
                    "logs": "\n".join(logs),
                }

            gdd = game.gdd_spec or {}

            # Generate level configurations
            logs.append("\n--- Generating Level Configurations ---")
            
            try:
                levels = await self.ai_service.generate_level_configs(gdd, level_count=10)
                logs.append(f"✓ Generated {len(levels)} level configs via AI")
            except Exception as e:
                logs.append(f"⚠ AI generation failed: {e}, using fallback")
                levels = self._generate_fallback_levels(game)

            # Generate files
            files = {}

            # Level configuration dart file
            files["lib/config/levels.dart"] = self._generate_levels_dart(levels, game)
            logs.append("✓ Generated levels.dart")

            # Level data JSON for easy editing
            import json
            files["assets/levels.json"] = json.dumps({"levels": levels}, indent=2)
            logs.append("✓ Generated levels.json")

            # Level select screen
            files["lib/ui/screens/level_select_screen.dart"] = self._generate_level_select(game)
            logs.append("✓ Generated level select screen")

            # Level regression tests
            files["test/levels_test.dart"] = self._generate_level_tests(game)
            logs.append("✓ Generated level tests")

            # Commit to GitHub
            logs.append("\n--- Committing to GitHub ---")
            
            commit_result = await self.github_service.create_multiple_files(
                repo_name=game.github_repo,
                files=files,
                commit_message="Step 9: Add all 10 level configurations",
            )

            if commit_result["success"]:
                logs.append(f"✓ Committed {len(files)} files")
            else:
                for path, content in files.items():
                    await self.github_service.create_file(
                        repo_name=game.github_repo,
                        file_path=path,
                        content=content,
                        commit_message=f"Add {path}",
                    )
                logs.append("✓ Committed files individually")

            # Store levels in GDD
            if game.gdd_spec:
                game.gdd_spec["levels"] = levels
                await db.commit()

            logs.append("\n--- Content Production Complete ---")

            validation = await self.validate(db, game, {"levels": levels})

            return {
                "success": validation["valid"],
                "artifacts": {
                    "level_count": len(levels),
                    "free_levels": 3,
                    "locked_levels": 7,
                    "files_created": list(files.keys()),
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("content_production_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    def _generate_fallback_levels(self, game: Game) -> List[Dict]:
        """Generate fallback level configs."""
        levels = []
        for i in range(1, 11):
            difficulty = (i - 1) / 9.0  # 0.0 to 1.0
            
            levels.append({
                "level_number": i,
                "name": f"Level {i}" if i > 1 else "Tutorial",
                "is_free": i <= 3,
                "unlock_requirement": "none" if i <= 3 else "rewarded_ad",
                "difficulty": round(difficulty, 2),
                "time_limit_seconds": None if i <= 2 else max(45, 120 - (i * 8)),
                "target_score": i * 100,
                "obstacles": {
                    "count": 3 + (i * 2),
                    "speed": 1.0 + (i * 0.15),
                },
                "collectibles": {
                    "count": 10 + (i * 2),
                    "value": 10,
                },
                "background_theme": self._get_theme_for_level(i),
            })
        return levels

    def _get_theme_for_level(self, level: int) -> str:
        """Get background theme based on level."""
        themes = ["meadow", "meadow", "forest", "forest", "mountain", 
                  "mountain", "cave", "cave", "sky", "sky"]
        return themes[level - 1] if level <= 10 else "sky"

    def _generate_levels_dart(self, levels: List[Dict], game: Game) -> str:
        """Generate Dart level configuration file."""
        code = '''/// Level configurations for the game
/// 
/// Auto-generated by GameFactory.
/// Contains all 10 level configurations with difficulty curve.

class LevelConfig {
  final int levelNumber;
  final String name;
  final bool isFree;
  final String unlockRequirement;
  final double difficulty;
  final int? timeLimitSeconds;
  final int targetScore;
  final int obstacleCount;
  final double obstacleSpeed;
  final int collectibleCount;
  final int collectibleValue;
  final String backgroundTheme;

  const LevelConfig({
    required this.levelNumber,
    required this.name,
    required this.isFree,
    required this.unlockRequirement,
    required this.difficulty,
    this.timeLimitSeconds,
    required this.targetScore,
    required this.obstacleCount,
    required this.obstacleSpeed,
    required this.collectibleCount,
    required this.collectibleValue,
    required this.backgroundTheme,
  });
}

class LevelConfigs {
  LevelConfigs._();

  static const List<LevelConfig> levels = [
'''
        for level in levels:
            obs = level.get("obstacles", {})
            col = level.get("collectibles", {})
            time_limit = level.get("time_limit_seconds")
            time_str = str(time_limit) if time_limit else "null"
            
            code += f'''    LevelConfig(
      levelNumber: {level["level_number"]},
      name: '{level.get("name", f"Level {level['level_number']}")}',
      isFree: {str(level.get("is_free", False)).lower()},
      unlockRequirement: '{level.get("unlock_requirement", "rewarded_ad")}',
      difficulty: {level.get("difficulty", 0.5)},
      timeLimitSeconds: {time_str},
      targetScore: {level.get("target_score", 100)},
      obstacleCount: {obs.get("count", 5)},
      obstacleSpeed: {obs.get("speed", 1.0)},
      collectibleCount: {col.get("count", 10)},
      collectibleValue: {col.get("value", 10)},
      backgroundTheme: '{level.get("background_theme", "default")}',
    ),
'''

        code += '''  ];

  static LevelConfig getLevel(int level) {
    if (level < 1 || level > levels.length) {
      return levels.first;
    }
    return levels[level - 1];
  }

  static bool isLevelFree(int level) {
    if (level < 1 || level > levels.length) return false;
    return levels[level - 1].isFree;
  }

  static int get totalLevels => levels.length;
  static int get freeLevels => levels.where((l) => l.isFree).length;
}
'''
        return code

    def _generate_level_select(self, game: Game) -> str:
        """Generate level select screen."""
        return '''import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/storage_service.dart';
import '../../services/audio_service.dart';
import '../../config/levels.dart';
import 'game_screen.dart';

class LevelSelectScreen extends StatelessWidget {
  const LevelSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final storage = Provider.of<StorageService>(context, listen: false);
    final unlockedLevels = storage.getUnlockedLevels();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Level'),
        backgroundColor: const Color(0xFF1A1A2E),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A1A2E), Color(0xFF16213E)],
          ),
        ),
        child: GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
          ),
          itemCount: LevelConfigs.totalLevels,
          itemBuilder: (context, index) {
            final level = LevelConfigs.levels[index];
            final isUnlocked = unlockedLevels.contains(level.levelNumber);
            final highScore = storage.getHighScores()[level.levelNumber] ?? 0;

            return _LevelTile(
              level: level,
              isUnlocked: isUnlocked,
              highScore: highScore,
              onTap: isUnlocked
                  ? () {
                      AudioService().playSound('button');
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => GameScreen(initialLevel: level.levelNumber),
                        ),
                      );
                    }
                  : null,
            );
          },
        ),
      ),
    );
  }
}

class _LevelTile extends StatelessWidget {
  final LevelConfig level;
  final bool isUnlocked;
  final int highScore;
  final VoidCallback? onTap;

  const _LevelTile({
    required this.level,
    required this.isUnlocked,
    required this.highScore,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isUnlocked ? Colors.deepPurple : Colors.grey[800],
          borderRadius: BorderRadius.circular(12),
          border: level.isFree
              ? Border.all(color: Colors.amber, width: 2)
              : null,
          boxShadow: isUnlocked
              ? [
                  BoxShadow(
                    color: Colors.deepPurple.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isUnlocked) ...[
              Text(
                '${level.levelNumber}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (highScore > 0)
                Text(
                  '⭐ $highScore',
                  style: const TextStyle(
                    color: Colors.amber,
                    fontSize: 12,
                  ),
                ),
            ] else
              const Icon(Icons.lock, color: Colors.white54, size: 32),
          ],
        ),
      ),
    );
  }
}
'''

    def _generate_level_tests(self, game: Game) -> str:
        """Generate level regression tests."""
        return f'''import 'package:flutter_test/flutter_test.dart';
import 'package:{game.slug.replace("-", "_")}/config/levels.dart';

void main() {{
  group('Level Configuration Tests', () {{
    test('should have exactly 10 levels', () {{
      expect(LevelConfigs.totalLevels, 10);
    }});

    test('should have 3 free levels', () {{
      expect(LevelConfigs.freeLevels, 3);
    }});

    test('levels 1-3 should be free', () {{
      expect(LevelConfigs.isLevelFree(1), true);
      expect(LevelConfigs.isLevelFree(2), true);
      expect(LevelConfigs.isLevelFree(3), true);
    }});

    test('levels 4-10 should be locked', () {{
      for (var i = 4; i <= 10; i++) {{
        expect(LevelConfigs.isLevelFree(i), false);
      }}
    }});

    test('difficulty should increase with level', () {{
      for (var i = 1; i < LevelConfigs.totalLevels; i++) {{
        final current = LevelConfigs.getLevel(i);
        final next = LevelConfigs.getLevel(i + 1);
        expect(next.difficulty, greaterThanOrEqualTo(current.difficulty));
      }}
    }});

    test('target score should increase with level', () {{
      for (var i = 1; i < LevelConfigs.totalLevels; i++) {{
        final current = LevelConfigs.getLevel(i);
        final next = LevelConfigs.getLevel(i + 1);
        expect(next.targetScore, greaterThanOrEqualTo(current.targetScore));
      }}
    }});

    test('all levels should have valid config', () {{
      for (final level in LevelConfigs.levels) {{
        expect(level.levelNumber, greaterThan(0));
        expect(level.name, isNotEmpty);
        expect(level.difficulty, greaterThanOrEqualTo(0));
        expect(level.difficulty, lessThanOrEqualTo(1));
        expect(level.targetScore, greaterThan(0));
        expect(level.obstacleCount, greaterThan(0));
        expect(level.collectibleCount, greaterThan(0));
      }}
    }});

    test('getLevel returns first level for invalid input', () {{
      expect(LevelConfigs.getLevel(0).levelNumber, 1);
      expect(LevelConfigs.getLevel(-1).levelNumber, 1);
      expect(LevelConfigs.getLevel(100).levelNumber, 1);
    }});
  }});
}}
'''

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate content production."""
        errors = []
        warnings = []

        levels = artifacts.get("levels", [])

        if len(levels) != 10:
            errors.append(f"Expected 10 levels, got {len(levels)}")

        free_count = sum(1 for l in levels if l.get("is_free"))
        if free_count != 3:
            warnings.append(f"Expected 3 free levels, got {free_count}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback content production."""
        if game.gdd_spec and "levels" in game.gdd_spec:
            del game.gdd_spec["levels"]
            await db.commit()
        return True
