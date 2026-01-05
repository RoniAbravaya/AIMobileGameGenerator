"""
Template Service

Manages Flutter + Flame game templates:
- Cloning official Flame templates
- Modifying project configuration
- Injecting GameFactory architecture
- Generating boilerplate code
"""

import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml
import asyncio

import structlog

from app.core.config import settings
from app.services.github_service import get_github_service
from app.services.ai_service import get_ai_service

logger = structlog.get_logger()


# Official Flame template repositories
FLAME_TEMPLATES = {
    "platformer": {
        "repo": "flame-engine/flame",
        # Flame no longer ships a dedicated "platformer" example; use trex as closest stable template.
        "subpath": "examples/games/trex",
        "description": "Jump-based side-scrolling template (T-Rex style)",
    },
    "runner": {
        "repo": "flame-engine/flame",
        "subpath": "examples/games/trex",
        "description": "Endless runner (T-Rex style)",
    },
    "puzzle": {
        "repo": "flame-engine/flame",
        "subpath": "examples/games/padracing",
        "description": "Pattern-based puzzle/racing hybrid",
    },
    "shooter": {
        "repo": "flame-engine/flame",
        "subpath": "examples/games/rogue_shooter",
        "description": "Space shooter with enemies",
    },
    "casual": {
        "repo": "flame-engine/flame",
        "subpath": "examples/games/crystal_ball",
        "description": "Simple casual template (crystal_ball)",
    },
    "default": {
        "repo": "flame-engine/flame",
        "subpath": "examples/games/crystal_ball",
        "description": "Default Flame game template",
    },
}


class TemplateService:
    """
    Service for managing game templates.
    
    Handles cloning, modification, and customization of Flutter + Flame templates.
    """

    def __init__(self):
        self.github_service = get_github_service()
        self.ai_service = get_ai_service()
        self.templates_dir = Path(settings.asset_storage_path).parent / "templates"
        self.templates_dir.mkdir(parents=True, exist_ok=True)

    def get_template_for_genre(self, genre: str) -> Dict[str, str]:
        """Get the appropriate template for a game genre."""
        genre_lower = genre.lower()
        return FLAME_TEMPLATES.get(genre_lower, FLAME_TEMPLATES["default"])

    async def clone_template(
        self,
        genre: str,
        target_path: str,
    ) -> Dict[str, Any]:
        """
        Clone a Flame template for a specific genre.
        
        Args:
            genre: Game genre
            target_path: Local path to clone to
        
        Returns:
            Clone result with path and files
        """
        template = self.get_template_for_genre(genre)
        repo = template["repo"]
        subpath = template.get("subpath", "")

        logger.info(
            "cloning_template",
            genre=genre,
            repo=repo,
            subpath=subpath,
        )

        try:
            # Clone the full repo first (shallow clone)
            # Use a unique temp directory per run to avoid cross-task races (same genre).
            temp_dir = Path(tempfile.mkdtemp(prefix=f"temp_{genre}_", dir=str(self.templates_dir)))

            # Clone
            clone_result = await self.github_service.clone_template(repo, str(temp_dir))
            
            if not clone_result["success"]:
                return clone_result

            # Extract the specific subpath if specified
            target = Path(target_path)
            if target.exists():
                shutil.rmtree(target, ignore_errors=True)
            target.mkdir(parents=True, exist_ok=True)

            if subpath:
                source = temp_dir / subpath
                if source.exists():
                    # Copy the subpath content
                    shutil.copytree(source, target, dirs_exist_ok=True)
                else:
                    # Subpath doesn't exist; avoid copying repo root (large monorepo) if possible.
                    logger.warning("subpath_not_found", subpath=subpath, repo=repo)
                    fallback = temp_dir / "examples"
                    shutil.copytree(fallback if fallback.exists() else temp_dir, target, dirs_exist_ok=True)
            else:
                shutil.copytree(temp_dir, target, dirs_exist_ok=True)

            # Clean up temp directory
            shutil.rmtree(temp_dir, ignore_errors=True)

            # List files
            files = [str(f.relative_to(target)) for f in target.rglob("*") if f.is_file()]

            logger.info(
                "template_cloned",
                genre=genre,
                path=str(target),
                file_count=len(files),
            )

            return {
                "success": True,
                "path": str(target),
                "template": repo,
                "subpath": subpath,
                "files": files,
            }

        except Exception as e:
            logger.exception("template_clone_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def create_project_structure(
        self,
        target_path: str,
        game_name: str,
        package_name: str,
    ) -> Dict[str, Any]:
        """
        Create a fresh Flutter + Flame project structure.
        
        Args:
            target_path: Target directory
            game_name: Game name
            package_name: Android package name (e.g., com.gamefactory.mygame)
        
        Returns:
            Creation result
        """
        target = Path(target_path)
        target.mkdir(parents=True, exist_ok=True)

        logger.info(
            "creating_project_structure",
            path=str(target),
            game_name=game_name,
        )

        try:
            # Create directory structure
            directories = [
                "lib/game/components",
                "lib/game/scenes",
                "lib/services",
                "lib/ui/overlays",
                "lib/ui/screens",
                "lib/config",
                "lib/models",
                "assets/images",
                "assets/audio",
                "test",
            ]

            for dir_path in directories:
                (target / dir_path).mkdir(parents=True, exist_ok=True)

            # Create pubspec.yaml
            pubspec = self._generate_pubspec(game_name, package_name)
            (target / "pubspec.yaml").write_text(pubspec)

            # Create main.dart
            main_dart = self._generate_main_dart(game_name)
            (target / "lib" / "main.dart").write_text(main_dart)

            # Create analysis_options.yaml
            analysis_options = self._generate_analysis_options()
            (target / "analysis_options.yaml").write_text(analysis_options)

            # Create .gitignore
            gitignore = self._generate_gitignore()
            (target / ".gitignore").write_text(gitignore)

            files_created = list(target.rglob("*"))

            return {
                "success": True,
                "path": str(target),
                "files_created": len([f for f in files_created if f.is_file()]),
                "directories_created": len([f for f in files_created if f.is_dir()]),
            }

        except Exception as e:
            logger.exception("project_structure_creation_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    def _generate_pubspec(self, game_name: str, package_name: str) -> str:
        """Generate pubspec.yaml content."""
        # Convert game name to valid Dart package name
        dart_name = game_name.lower().replace(" ", "_").replace("-", "_")
        
        return f"""name: {dart_name}
description: {game_name} - Generated by GameFactory
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # Flame game engine
  flame: ^1.14.0
  flame_audio: ^2.1.6
  
  # State management
  provider: ^6.1.1
  
  # Analytics
  firebase_core: ^2.24.2
  firebase_analytics: ^10.7.4
  
  # Ads
  google_mobile_ads: ^4.0.0
  
  # Storage
  shared_preferences: ^2.2.2
  
  # Utilities
  equatable: ^2.0.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  mocktail: ^1.0.1

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/audio/
"""

    def _generate_main_dart(self, game_name: str) -> str:
        """Generate main.dart content."""
        return f'''import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';

import 'game/game.dart';
import 'services/analytics_service.dart';
import 'services/ad_service.dart';
import 'services/storage_service.dart';

/// {game_name} - Generated by GameFactory
/// 
/// A Flutter + Flame mobile game with analytics, ads, and level progression.
void main() async {{
  WidgetsFlutterBinding.ensureInitialized();
  
  // Lock orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize services
  final analyticsService = AnalyticsService();
  final adService = AdService();
  final storageService = StorageService();
  
  await analyticsService.initialize();
  await adService.initialize();
  await storageService.initialize();
  
  runApp(
    MultiProvider(
      providers: [
        Provider<AnalyticsService>.value(value: analyticsService),
        Provider<AdService>.value(value: adService),
        Provider<StorageService>.value(value: storageService),
      ],
      child: const GameApp(),
    ),
  );
}}

/// Main application widget
class GameApp extends StatelessWidget {{
  const GameApp({{super.key}});

  @override
  Widget build(BuildContext context) {{
    return MaterialApp(
      title: '{game_name}',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
      ),
      home: const GameScreen(),
    );
  }}
}}
'''

    def _generate_analysis_options(self) -> str:
        """Generate analysis_options.yaml content."""
        return """include: package:flutter_lints/flutter.yaml

linter:
  rules:
    prefer_const_constructors: true
    prefer_const_declarations: true
    avoid_print: true
    prefer_single_quotes: true

analyzer:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
"""

    def _generate_gitignore(self) -> str:
        """Generate .gitignore content."""
        return """# Flutter/Dart
.dart_tool/
.packages
build/
.flutter-plugins
.flutter-plugins-dependencies
.pub-cache/
.pub/
pubspec.lock

# IDE
.idea/
*.iml
.vscode/

# macOS
.DS_Store
*.swp

# Android
android/.gradle/
android/local.properties
android/*.iml
android/key.properties
android/app/release/

# iOS
ios/Pods/
ios/.symlinks/
ios/Flutter/Flutter.framework
ios/Flutter/Flutter.podspec
ios/Flutter/Generated.xcconfig
ios/Flutter/app.flx
ios/Flutter/app.zip
ios/Flutter/flutter_assets/
ios/ServiceDefinitions.json
ios/Runner/GeneratedPluginRegistrant.*

# Coverage
coverage/

# Build artifacts
*.apk
*.aab
*.ipa
"""

    async def inject_gamefactory_architecture(
        self,
        target_path: str,
        gdd: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Inject GameFactory standard architecture into a project.
        
        Args:
            target_path: Project path
            gdd: Game Design Document
        
        Returns:
            Injection result with files created
        """
        target = Path(target_path)
        files_created = []

        logger.info(
            "injecting_architecture",
            path=str(target),
            genre=gdd.get("genre"),
        )

        try:
            # Generate and write game core
            game_dart = await self._generate_game_core(gdd)
            game_path = target / "lib" / "game" / "game.dart"
            game_path.parent.mkdir(parents=True, exist_ok=True)
            game_path.write_text(game_dart)
            files_created.append(str(game_path.relative_to(target)))

            # Generate services
            services = await self._generate_services(gdd)
            for filename, content in services.items():
                service_path = target / "lib" / "services" / filename
                service_path.parent.mkdir(parents=True, exist_ok=True)
                service_path.write_text(content)
                files_created.append(str(service_path.relative_to(target)))

            # Generate config
            config_files = await self._generate_config(gdd)
            for filename, content in config_files.items():
                config_path = target / "lib" / "config" / filename
                config_path.parent.mkdir(parents=True, exist_ok=True)
                config_path.write_text(content)
                files_created.append(str(config_path.relative_to(target)))

            # Generate UI overlays
            overlays = await self._generate_overlays(gdd)
            for filename, content in overlays.items():
                overlay_path = target / "lib" / "ui" / "overlays" / filename
                overlay_path.parent.mkdir(parents=True, exist_ok=True)
                overlay_path.write_text(content)
                files_created.append(str(overlay_path.relative_to(target)))

            # Generate screens
            screens = await self._generate_screens(gdd)
            for filename, content in screens.items():
                screen_path = target / "lib" / "ui" / "screens" / filename
                screen_path.parent.mkdir(parents=True, exist_ok=True)
                screen_path.write_text(content)
                files_created.append(str(screen_path.relative_to(target)))

            logger.info(
                "architecture_injected",
                files_created=len(files_created),
            )

            return {
                "success": True,
                "files_created": files_created,
            }

        except Exception as e:
            logger.exception("architecture_injection_failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
            }

    async def _generate_game_core(self, gdd: Dict[str, Any]) -> str:
        """Generate the main game class using AI."""
        game_name = gdd.get("game_name", "MyGame")
        genre = gdd.get("genre", "casual")
        mechanics = gdd.get("mechanics", {})
        core_loop = gdd.get("core_loop", {})

        try:
            return await self.ai_service.generate_dart_code(
                file_purpose=f"Main FlameGame class for a {genre} game called {game_name}",
                game_context=gdd,
                additional_instructions=f"""
Create a FlameGame subclass with:
1. Game state management (playing, paused, game_over, level_complete)
2. Level loading system
3. Score tracking
4. Integration hooks for analytics, ads, and storage services
5. Overlay management for UI
6. Primary mechanic: {core_loop.get('primary_action', 'tap')}
7. Components for: player, obstacles, collectibles

The class should be named {game_name.replace(' ', '')}Game and extend FlameGame.
Include proper imports from flame package.
""",
            )
        except Exception as e:
            logger.warning("ai_generation_failed_using_template", error=str(e))
            return self._get_template_game_core(gdd)

    def _get_template_game_core(self, gdd: Dict[str, Any]) -> str:
        """Fallback template for game core."""
        game_name = gdd.get("game_name", "MyGame").replace(" ", "")
        
        return f'''import 'package:flame/game.dart';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';

import '../services/analytics_service.dart';
import '../config/levels.dart';

/// Main game class for {game_name}
/// 
/// Manages game state, level progression, and core gameplay loop.
class {game_name}Game extends FlameGame 
    with HasCollisionDetection, TapDetector {{
  
  // Services (injected from Flutter)
  late AnalyticsService analyticsService;
  
  // Game state
  GameState state = GameState.menu;
  int currentLevel = 1;
  int score = 0;
  int lives = 3;
  
  // Level configuration
  LevelConfig? levelConfig;
  
  @override
  Future<void> onLoad() async {{
    await super.onLoad();
    
    // Add camera
    camera.viewfinder.visibleGameSize = Vector2(400, 800);
    
    // Load initial level
    await loadLevel(currentLevel);
  }}
  
  Future<void> loadLevel(int level) async {{
    // Clear existing components
    removeAll(children.whereType<Component>());
    
    // Get level config
    levelConfig = LevelConfigs.getLevel(level);
    
    // Log analytics
    analyticsService.logLevelStart(level);
    
    // Update state
    state = GameState.playing;
    score = 0;
    
    // TODO: Add level-specific components
  }}
  
  @override
  void onTapDown(TapDownInfo info) {{
    if (state != GameState.playing) return;
    
    // Handle tap input
    final position = info.eventPosition.widget;
    // TODO: Implement tap handling based on mechanics
  }}
  
  void onLevelComplete() {{
    state = GameState.levelComplete;
    analyticsService.logLevelComplete(currentLevel, score);
    overlays.add('LevelCompleteOverlay');
  }}
  
  void onGameOver() {{
    state = GameState.gameOver;
    analyticsService.logLevelFail(currentLevel, score);
    overlays.add('GameOverOverlay');
  }}
  
  void nextLevel() {{
    currentLevel++;
    loadLevel(currentLevel);
  }}
  
  void restartLevel() {{
    loadLevel(currentLevel);
  }}
}}

enum GameState {{
  menu,
  playing,
  paused,
  levelComplete,
  gameOver,
}}
'''

    async def _generate_services(self, gdd: Dict[str, Any]) -> Dict[str, str]:
        """Generate service files."""
        return {
            "analytics_service.dart": self._get_analytics_service(),
            "ad_service.dart": self._get_ad_service(),
            "storage_service.dart": self._get_storage_service(),
        }

    def _get_analytics_service(self) -> str:
        """Generate analytics service."""
        return '''import 'package:firebase_analytics/firebase_analytics.dart';

/// Analytics service for tracking game events
/// 
/// Implements the GameFactory standard event schema.
class AnalyticsService {
  late FirebaseAnalytics _analytics;
  bool _initialized = false;
  
  Future<void> initialize() async {
    _analytics = FirebaseAnalytics.instance;
    _initialized = true;
  }
  
  Future<void> logEvent(String name, Map<String, dynamic>? params) async {
    if (!_initialized) return;
    await _analytics.logEvent(name: name, parameters: params);
  }
  
  // Standard GameFactory events
  
  Future<void> logGameStart() async {
    await logEvent('game_start', {'timestamp': DateTime.now().toIso8601String()});
  }
  
  Future<void> logLevelStart(int level) async {
    await logEvent('level_start', {'level': level});
  }
  
  Future<void> logLevelComplete(int level, int score) async {
    await logEvent('level_complete', {'level': level, 'score': score});
  }
  
  Future<void> logLevelFail(int level, int score) async {
    await logEvent('level_fail', {'level': level, 'score': score});
  }
  
  Future<void> logUnlockPromptShown(int level) async {
    await logEvent('unlock_prompt_shown', {'level': level});
  }
  
  Future<void> logRewardedAdStarted(int level) async {
    await logEvent('rewarded_ad_started', {'level': level});
  }
  
  Future<void> logRewardedAdCompleted(int level) async {
    await logEvent('rewarded_ad_completed', {'level': level});
  }
  
  Future<void> logRewardedAdFailed(int level, String reason) async {
    await logEvent('rewarded_ad_failed', {'level': level, 'reason': reason});
  }
  
  Future<void> logLevelUnlocked(int level) async {
    await logEvent('level_unlocked', {'level': level});
  }
}
'''

    def _get_ad_service(self) -> str:
        """Generate ad service."""
        return '''import 'package:google_mobile_ads/google_mobile_ads.dart';

/// Ad service for managing rewarded ads
/// 
/// Handles ad loading, showing, and reward callbacks.
class AdService {
  RewardedAd? _rewardedAd;
  bool _initialized = false;
  
  // Test ad unit IDs - replace with real ones in production
  static const String _rewardedAdUnitId = 'ca-app-pub-3940256099942544/5224354917';
  
  Future<void> initialize() async {
    await MobileAds.instance.initialize();
    _initialized = true;
    await _loadRewardedAd();
  }
  
  Future<void> _loadRewardedAd() async {
    await RewardedAd.load(
      adUnitId: _rewardedAdUnitId,
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) {
          _rewardedAd = ad;
        },
        onAdFailedToLoad: (error) {
          _rewardedAd = null;
        },
      ),
    );
  }
  
  bool get isAdReady => _rewardedAd != null;
  
  Future<bool> showRewardedAd({
    required Function onRewarded,
    Function? onFailed,
  }) async {
    if (_rewardedAd == null) {
      onFailed?.call();
      return false;
    }
    
    _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        _loadRewardedAd();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        _loadRewardedAd();
        onFailed?.call();
      },
    );
    
    await _rewardedAd!.show(
      onUserEarnedReward: (ad, reward) {
        onRewarded();
      },
    );
    
    return true;
  }
}
'''

    def _get_storage_service(self) -> str:
        """Generate storage service."""
        return '''import 'package:shared_preferences/shared_preferences.dart';

/// Storage service for persisting game data
/// 
/// Handles level unlock state, high scores, and settings.
class StorageService {
  late SharedPreferences _prefs;
  bool _initialized = false;
  
  static const String _unlockedLevelsKey = 'unlocked_levels';
  static const String _highScoresKey = 'high_scores';
  static const String _soundEnabledKey = 'sound_enabled';
  static const String _musicEnabledKey = 'music_enabled';
  
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _initialized = true;
  }
  
  // Level unlock management
  
  List<int> getUnlockedLevels() {
    final data = _prefs.getStringList(_unlockedLevelsKey);
    if (data == null) return [1, 2, 3]; // Default free levels
    return data.map((e) => int.parse(e)).toList();
  }
  
  Future<void> unlockLevel(int level) async {
    final unlocked = getUnlockedLevels();
    if (!unlocked.contains(level)) {
      unlocked.add(level);
      await _prefs.setStringList(
        _unlockedLevelsKey,
        unlocked.map((e) => e.toString()).toList(),
      );
    }
  }
  
  bool isLevelUnlocked(int level) {
    return getUnlockedLevels().contains(level);
  }
  
  // High scores
  
  Map<int, int> getHighScores() {
    final data = _prefs.getStringList(_highScoresKey);
    if (data == null) return {};
    
    final scores = <int, int>{};
    for (final entry in data) {
      final parts = entry.split(':');
      if (parts.length == 2) {
        scores[int.parse(parts[0])] = int.parse(parts[1]);
      }
    }
    return scores;
  }
  
  Future<void> setHighScore(int level, int score) async {
    final scores = getHighScores();
    if (!scores.containsKey(level) || scores[level]! < score) {
      scores[level] = score;
      await _prefs.setStringList(
        _highScoresKey,
        scores.entries.map((e) => '${e.key}:${e.value}').toList(),
      );
    }
  }
  
  // Settings
  
  bool get soundEnabled => _prefs.getBool(_soundEnabledKey) ?? true;
  bool get musicEnabled => _prefs.getBool(_musicEnabledKey) ?? true;
  
  Future<void> setSoundEnabled(bool enabled) async {
    await _prefs.setBool(_soundEnabledKey, enabled);
  }
  
  Future<void> setMusicEnabled(bool enabled) async {
    await _prefs.setBool(_musicEnabledKey, enabled);
  }
}
'''

    async def _generate_config(self, gdd: Dict[str, Any]) -> Dict[str, str]:
        """Generate configuration files."""
        return {
            "levels.dart": self._get_levels_config(gdd),
            "constants.dart": self._get_constants(gdd),
        }

    def _get_levels_config(self, gdd: Dict[str, Any]) -> str:
        """Generate levels configuration."""
        difficulty_curve = gdd.get("difficulty_curve", {})
        
        return '''/// Level configurations for the game
/// 
/// Defines parameters for all 10 levels including difficulty,
/// time limits, and unlock requirements.

class LevelConfig {
  final int levelNumber;
  final String name;
  final bool isFree;
  final double difficulty;
  final int? timeLimitSeconds;
  final int targetScore;
  final int obstacleCount;
  final double obstacleSpeed;
  final int collectibleCount;
  final String backgroundTheme;
  
  const LevelConfig({
    required this.levelNumber,
    required this.name,
    required this.isFree,
    required this.difficulty,
    this.timeLimitSeconds,
    required this.targetScore,
    required this.obstacleCount,
    required this.obstacleSpeed,
    required this.collectibleCount,
    required this.backgroundTheme,
  });
}

class LevelConfigs {
  static const List<LevelConfig> levels = [
    LevelConfig(
      levelNumber: 1,
      name: 'Tutorial',
      isFree: true,
      difficulty: 0.1,
      timeLimitSeconds: null,
      targetScore: 100,
      obstacleCount: 3,
      obstacleSpeed: 1.0,
      collectibleCount: 10,
      backgroundTheme: 'meadow',
    ),
    LevelConfig(
      levelNumber: 2,
      name: 'Getting Started',
      isFree: true,
      difficulty: 0.2,
      timeLimitSeconds: 120,
      targetScore: 200,
      obstacleCount: 5,
      obstacleSpeed: 1.2,
      collectibleCount: 15,
      backgroundTheme: 'meadow',
    ),
    LevelConfig(
      levelNumber: 3,
      name: 'First Challenge',
      isFree: true,
      difficulty: 0.3,
      timeLimitSeconds: 90,
      targetScore: 300,
      obstacleCount: 7,
      obstacleSpeed: 1.4,
      collectibleCount: 20,
      backgroundTheme: 'forest',
    ),
    LevelConfig(
      levelNumber: 4,
      name: 'Into the Woods',
      isFree: false,
      difficulty: 0.4,
      timeLimitSeconds: 90,
      targetScore: 400,
      obstacleCount: 10,
      obstacleSpeed: 1.6,
      collectibleCount: 25,
      backgroundTheme: 'forest',
    ),
    LevelConfig(
      levelNumber: 5,
      name: 'Midway Point',
      isFree: false,
      difficulty: 0.5,
      timeLimitSeconds: 75,
      targetScore: 500,
      obstacleCount: 12,
      obstacleSpeed: 1.8,
      collectibleCount: 30,
      backgroundTheme: 'mountain',
    ),
    LevelConfig(
      levelNumber: 6,
      name: 'Rising Difficulty',
      isFree: false,
      difficulty: 0.6,
      timeLimitSeconds: 75,
      targetScore: 600,
      obstacleCount: 15,
      obstacleSpeed: 2.0,
      collectibleCount: 35,
      backgroundTheme: 'mountain',
    ),
    LevelConfig(
      levelNumber: 7,
      name: 'Expert Zone',
      isFree: false,
      difficulty: 0.7,
      timeLimitSeconds: 60,
      targetScore: 700,
      obstacleCount: 18,
      obstacleSpeed: 2.2,
      collectibleCount: 40,
      backgroundTheme: 'cave',
    ),
    LevelConfig(
      levelNumber: 8,
      name: 'Master Level',
      isFree: false,
      difficulty: 0.8,
      timeLimitSeconds: 60,
      targetScore: 800,
      obstacleCount: 20,
      obstacleSpeed: 2.5,
      collectibleCount: 45,
      backgroundTheme: 'cave',
    ),
    LevelConfig(
      levelNumber: 9,
      name: 'Ultimate Challenge',
      isFree: false,
      difficulty: 0.9,
      timeLimitSeconds: 45,
      targetScore: 900,
      obstacleCount: 25,
      obstacleSpeed: 2.8,
      collectibleCount: 50,
      backgroundTheme: 'sky',
    ),
    LevelConfig(
      levelNumber: 10,
      name: 'Final Boss',
      isFree: false,
      difficulty: 1.0,
      timeLimitSeconds: 45,
      targetScore: 1000,
      obstacleCount: 30,
      obstacleSpeed: 3.0,
      collectibleCount: 60,
      backgroundTheme: 'sky',
    ),
  ];
  
  static LevelConfig getLevel(int level) {
    if (level < 1 || level > levels.length) {
      return levels.first;
    }
    return levels[level - 1];
  }
  
  static bool isLevelFree(int level) {
    return level >= 1 && level <= 3;
  }
}
'''

    def _get_constants(self, gdd: Dict[str, Any]) -> str:
        """Generate game constants."""
        style_guide = gdd.get("asset_style_guide", {})
        colors = style_guide.get("color_palette", ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"])
        
        return f'''import 'package:flutter/material.dart';

/// Game constants and configuration values
/// 
/// Contains colors, dimensions, and other constant values.

class GameConstants {{
  // Game settings
  static const int totalLevels = 10;
  static const int freeLevels = 3;
  static const int startingLives = 3;
  
  // Timing
  static const double gameTickRate = 60.0;
  static const Duration levelTransitionDuration = Duration(milliseconds: 500);
  
  // Game dimensions (logical pixels)
  static const double gameWidth = 400;
  static const double gameHeight = 800;
  
  // Player
  static const double playerWidth = 50;
  static const double playerHeight = 50;
  static const double playerSpeed = 200;
  static const double jumpForce = 400;
  
  // Obstacles
  static const double minObstacleGap = 150;
  static const double maxObstacleSpeed = 300;
  
  // Collectibles
  static const int coinValue = 10;
  static const int starValue = 50;
}}

class GameColors {{
  // Primary palette from GDD
  static const Color primary = Color(0x{colors[0].replace('#', 'FF')});
  static const Color secondary = Color(0x{colors[1].replace('#', 'FF') if len(colors) > 1 else 'FF4ECDC4'});
  static const Color accent = Color(0x{colors[2].replace('#', 'FF') if len(colors) > 2 else 'FF45B7D1'});
  static const Color success = Color(0x{colors[3].replace('#', 'FF') if len(colors) > 3 else 'FF96CEB4'});
  static const Color warning = Color(0x{colors[4].replace('#', 'FF') if len(colors) > 4 else 'FFFFEAA7'});
  
  // UI colors
  static const Color background = Color(0xFF1A1A2E);
  static const Color surface = Color(0xFF16213E);
  static const Color text = Color(0xFFE8E8E8);
  static const Color textSecondary = Color(0xFFB0B0B0);
}}
'''

    async def _generate_overlays(self, gdd: Dict[str, Any]) -> Dict[str, str]:
        """Generate UI overlay files."""
        return {
            "game_overlay.dart": self._get_game_overlay(),
            "pause_overlay.dart": self._get_pause_overlay(),
            "level_complete_overlay.dart": self._get_level_complete_overlay(),
            "game_over_overlay.dart": self._get_game_over_overlay(),
        }

    def _get_game_overlay(self) -> str:
        """Generate main game HUD overlay."""
        return '''import 'package:flutter/material.dart';
import '../../game/game.dart';

/// Main game HUD overlay showing score, lives, and pause button
class GameOverlay extends StatelessWidget {
  final dynamic game;
  
  const GameOverlay({super.key, required this.game});
  
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Score
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    '${game.score}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            
            // Pause button
            IconButton(
              onPressed: () {
                game.pauseEngine();
                game.overlays.add('PauseOverlay');
              },
              icon: const Icon(Icons.pause_circle, color: Colors.white, size: 40),
            ),
          ],
        ),
      ),
    );
  }
}
'''

    def _get_pause_overlay(self) -> str:
        """Generate pause menu overlay."""
        return '''import 'package:flutter/material.dart';

/// Pause menu overlay
class PauseOverlay extends StatelessWidget {
  final dynamic game;
  
  const PauseOverlay({super.key, required this.game});
  
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black87,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'PAUSED',
              style: TextStyle(
                color: Colors.white,
                fontSize: 48,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 40),
            ElevatedButton.icon(
              onPressed: () {
                game.overlays.remove('PauseOverlay');
                game.resumeEngine();
              },
              icon: const Icon(Icons.play_arrow),
              label: const Text('RESUME'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                game.overlays.remove('PauseOverlay');
                game.restartLevel();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('RESTART'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
'''

    def _get_level_complete_overlay(self) -> str:
        """Generate level complete overlay."""
        return '''import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/storage_service.dart';
import '../../services/ad_service.dart';
import '../../services/analytics_service.dart';
import '../../config/levels.dart';

/// Level complete overlay with next level or ad unlock
class LevelCompleteOverlay extends StatelessWidget {
  final dynamic game;
  
  const LevelCompleteOverlay({super.key, required this.game});
  
  @override
  Widget build(BuildContext context) {
    final storage = Provider.of<StorageService>(context, listen: false);
    final adService = Provider.of<AdService>(context, listen: false);
    final analytics = Provider.of<AnalyticsService>(context, listen: false);
    
    final nextLevel = game.currentLevel + 1;
    final isNextLevelFree = LevelConfigs.isLevelFree(nextLevel);
    final isNextLevelUnlocked = storage.isLevelUnlocked(nextLevel);
    
    return Container(
      color: Colors.black87,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.celebration, color: Colors.amber, size: 80),
            const SizedBox(height: 20),
            const Text(
              'LEVEL COMPLETE!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Score: ${game.score}',
              style: const TextStyle(color: Colors.white70, fontSize: 24),
            ),
            const SizedBox(height: 40),
            
            if (nextLevel <= 10) ...[
              if (isNextLevelFree || isNextLevelUnlocked)
                ElevatedButton.icon(
                  onPressed: () {
                    game.overlays.remove('LevelCompleteOverlay');
                    game.nextLevel();
                  },
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('NEXT LEVEL'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  ),
                )
              else
                Column(
                  children: [
                    const Text(
                      'Watch an ad to unlock the next level',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () async {
                        analytics.logUnlockPromptShown(nextLevel);
                        analytics.logRewardedAdStarted(nextLevel);
                        
                        await adService.showRewardedAd(
                          onRewarded: () async {
                            await storage.unlockLevel(nextLevel);
                            analytics.logRewardedAdCompleted(nextLevel);
                            analytics.logLevelUnlocked(nextLevel);
                            
                            game.overlays.remove('LevelCompleteOverlay');
                            game.nextLevel();
                          },
                          onFailed: () {
                            analytics.logRewardedAdFailed(nextLevel, 'ad_not_available');
                          },
                        );
                      },
                      icon: const Icon(Icons.play_circle),
                      label: const Text('WATCH AD'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                      ),
                    ),
                  ],
                ),
            ] else
              const Text(
                'Congratulations! You completed all levels!',
                style: TextStyle(color: Colors.amber, fontSize: 18),
              ),
          ],
        ),
      ),
    );
  }
}
'''

    def _get_game_over_overlay(self) -> str:
        """Generate game over overlay."""
        return '''import 'package:flutter/material.dart';

/// Game over overlay with retry option
class GameOverOverlay extends StatelessWidget {
  final dynamic game;
  
  const GameOverOverlay({super.key, required this.game});
  
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black87,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.sentiment_dissatisfied, color: Colors.red, size: 80),
            const SizedBox(height: 20),
            const Text(
              'GAME OVER',
              style: TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Score: ${game.score}',
              style: const TextStyle(color: Colors.white70, fontSize: 24),
            ),
            const SizedBox(height: 40),
            ElevatedButton.icon(
              onPressed: () {
                game.overlays.remove('GameOverOverlay');
                game.restartLevel();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('TRY AGAIN'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
'''

    async def _generate_screens(self, gdd: Dict[str, Any]) -> Dict[str, str]:
        """Generate screen files."""
        return {
            "game_screen.dart": self._get_game_screen(gdd),
            "menu_screen.dart": self._get_menu_screen(gdd),
            "level_select_screen.dart": self._get_level_select_screen(gdd),
        }

    def _get_game_screen(self, gdd: Dict[str, Any]) -> str:
        """Generate main game screen."""
        game_name = gdd.get("game_name", "MyGame").replace(" ", "")
        
        return f'''import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../game/game.dart';
import '../../services/analytics_service.dart';
import '../overlays/game_overlay.dart';
import '../overlays/pause_overlay.dart';
import '../overlays/level_complete_overlay.dart';
import '../overlays/game_over_overlay.dart';

/// Main game screen containing the Flame game widget
class GameScreen extends StatefulWidget {{
  const GameScreen({{super.key}});

  @override
  State<GameScreen> createState() => _GameScreenState();
}}

class _GameScreenState extends State<GameScreen> {{
  late {game_name}Game game;

  @override
  void initState() {{
    super.initState();
    game = {game_name}Game();
  }}

  @override
  void didChangeDependencies() {{
    super.didChangeDependencies();
    game.analyticsService = Provider.of<AnalyticsService>(context, listen: false);
    game.analyticsService.logGameStart();
  }}

  @override
  Widget build(BuildContext context) {{
    return Scaffold(
      body: GameWidget(
        game: game,
        overlayBuilderMap: {{
          'GameOverlay': (context, game) => GameOverlay(game: game),
          'PauseOverlay': (context, game) => PauseOverlay(game: game),
          'LevelCompleteOverlay': (context, game) => LevelCompleteOverlay(game: game),
          'GameOverOverlay': (context, game) => GameOverOverlay(game: game),
        }},
        initialActiveOverlays: const ['GameOverlay'],
      ),
    );
  }}
}}
'''

    def _get_menu_screen(self, gdd: Dict[str, Any]) -> str:
        """Generate menu screen."""
        game_name = gdd.get("game_name", "My Game")
        
        return f'''import 'package:flutter/material.dart';
import 'game_screen.dart';
import 'level_select_screen.dart';

/// Main menu screen
class MenuScreen extends StatelessWidget {{
  const MenuScreen({{super.key}});

  @override
  Widget build(BuildContext context) {{
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A1A2E), Color(0xFF16213E)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  '{game_name}',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 60),
                ElevatedButton(
                  onPressed: () {{
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const GameScreen()),
                    );
                  }},
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
                  ),
                  child: const Text('PLAY', style: TextStyle(fontSize: 24)),
                ),
                const SizedBox(height: 20),
                OutlinedButton(
                  onPressed: () {{
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LevelSelectScreen()),
                    );
                  }},
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  ),
                  child: const Text('SELECT LEVEL'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }}
}}
'''

    def _get_level_select_screen(self, gdd: Dict[str, Any]) -> str:
        """Generate level select screen."""
        return '''import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/storage_service.dart';
import '../../config/levels.dart';

/// Level selection screen
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
          itemCount: LevelConfigs.levels.length,
          itemBuilder: (context, index) {
            final level = LevelConfigs.levels[index];
            final isUnlocked = unlockedLevels.contains(level.levelNumber);
            
            return GestureDetector(
              onTap: isUnlocked
                  ? () {
                      // Navigate to game with specific level
                      Navigator.pop(context);
                    }
                  : null,
              child: Container(
                decoration: BoxDecoration(
                  color: isUnlocked ? Colors.deepPurple : Colors.grey[800],
                  borderRadius: BorderRadius.circular(12),
                  border: level.isFree
                      ? Border.all(color: Colors.amber, width: 2)
                      : null,
                ),
                child: Center(
                  child: isUnlocked
                      ? Text(
                          '${level.levelNumber}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : const Icon(Icons.lock, color: Colors.white54),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
'''


# Singleton instance
_template_service: Optional[TemplateService] = None


def get_template_service() -> TemplateService:
    """Get or create the template service singleton."""
    global _template_service
    if _template_service is None:
        _template_service = TemplateService()
    return _template_service
