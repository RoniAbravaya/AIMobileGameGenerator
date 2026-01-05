"""
Step 6: Core Prototype

Implements the main gameplay mechanic loop:
- Player controls based on GDD mechanics
- Basic collision detection
- Score system
- Win/lose conditions
- Placeholder assets allowed (will be replaced in Step 7)
"""

from typing import Any, Dict, List

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.services.ai_service import get_ai_service
from app.services.github_service import get_github_service
from app.services.mechanic_code_templates import (
    get_mechanic_code,
    combine_mechanics_code,
    MECHANIC_CODE_TEMPLATES,
)
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


class CorePrototypeStep(BaseStepExecutor):
    """
    Step 6: Implement the core gameplay prototype.
    
    Creates a playable loop with the main mechanic.
    """

    step_number = 6
    step_name = "core_prototype"

    def __init__(self):
        super().__init__()
        self.ai_service = get_ai_service()
        self.github_service = get_github_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Implement core gameplay prototype."""
        self.logger.info("implementing_core_prototype", game_id=str(game.id))

        logs = []
        logs.append(f"Starting core prototype for {game.name}")

        try:
            if not game.gdd_spec:
                return {
                    "success": False,
                    "error": "Missing GDD spec",
                    "logs": "\n".join(logs),
                }

            if not game.github_repo:
                return {
                    "success": False,
                    "error": "Missing GitHub repo",
                    "logs": "\n".join(logs),
                }

            gdd = game.gdd_spec
            genre = game.genre.lower()
            mechanics = gdd.get("mechanics", {})
            core_loop = gdd.get("core_loop", {})

            logs.append(f"Genre: {genre}")
            logs.append(f"Primary mechanic: {mechanics.get('primary', 'tap')}")
            logs.append(f"Core loop: {core_loop.get('description', 'N/A')}")

            # Get selected mechanics for code generation
            selected_mechanics = game.selected_mechanics or []
            if not selected_mechanics:
                selected_mechanics = mechanics.get("selected_from_library", [])
            logs.append(f"Selected mechanics: {selected_mechanics}")

            # Generate core gameplay files
            logs.append("\n--- Generating Core Gameplay ---")

            files = {}

            # Generate mechanic-specific code files
            mechanic_files = self._generate_mechanic_code_files(selected_mechanics)
            files.update(mechanic_files)
            logs.append(f"✓ Generated {len(mechanic_files)} mechanic-specific files")

            # Main game file with full implementation
            files["lib/game/game.dart"] = await self._generate_main_game(game)
            logs.append("✓ Generated main game class")

            # Player with genre-specific mechanics
            files["lib/game/components/player.dart"] = await self._generate_player(game)
            logs.append("✓ Generated player component")

            # Obstacle spawner and obstacle
            files["lib/game/components/obstacle.dart"] = await self._generate_obstacle(game)
            files["lib/game/components/spawner.dart"] = await self._generate_spawner(game)
            logs.append("✓ Generated obstacle and spawner")

            # Collectible
            files["lib/game/components/collectible.dart"] = await self._generate_collectible(game)
            logs.append("✓ Generated collectible component")

            # Game controller/manager
            files["lib/game/game_controller.dart"] = await self._generate_game_controller(game)
            logs.append("✓ Generated game controller")

            # Input handler
            files["lib/game/input_handler.dart"] = self._generate_input_handler(game)
            logs.append("✓ Generated input handler")

            # Commit all files
            logs.append("\n--- Committing to GitHub ---")
            
            commit_result = await self.github_service.create_multiple_files(
                repo_name=game.github_repo,
                files=files,
                commit_message="Step 6: Implement core gameplay prototype",
            )

            if commit_result["success"]:
                logs.append(f"✓ Committed {len(files)} files")
            else:
                success_count = 0
                for path, content in files.items():
                    result = await self.github_service.create_file(
                        repo_name=game.github_repo,
                        file_path=path,
                        content=content,
                        commit_message=f"Add {path}",
                    )
                    if result.get("success"):
                        success_count += 1
                logs.append(f"✓ Committed {success_count}/{len(files)} files individually")

            logs.append("\n--- Core Prototype Complete ---")

            validation = await self.validate(db, game, {"files": list(files.keys())})

            return {
                "success": validation["valid"],
                "artifacts": {
                    "files_created": list(files.keys()),
                    "genre": genre,
                    "primary_mechanic": mechanics.get("primary"),
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("core_prototype_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    def _generate_mechanic_code_files(self, mechanic_names: List[str]) -> Dict[str, str]:
        """Generate mechanic-specific code files based on selected mechanics."""
        files = {}
        
        # Combine all mechanic code into organized sections
        combined = combine_mechanics_code(mechanic_names)
        
        # Generate mixins file
        if combined["mixins"]:
            mixins_code = '''/// Mechanic Mixins
/// 
/// Auto-generated mixins for game mechanics.
/// These provide reusable behavior patterns.

import 'package:flame/components.dart';
import 'package:flutter/material.dart';

'''
            for mixin_code in combined["mixins"]:
                mixins_code += mixin_code + "\n"
            files["lib/game/mixins/mechanic_mixins.dart"] = mixins_code

        # Generate mechanic components file
        if combined["components"]:
            components_code = '''/// Mechanic Components
/// 
/// Auto-generated components for game mechanics.

import 'dart:math';
import 'package:flame/components.dart';
import 'package:flame/collisions.dart';
import 'package:flame/input.dart';
import 'package:flutter/material.dart';

'''
            for component_code in combined["components"]:
                components_code += component_code + "\n"
            files["lib/game/components/mechanic_components.dart"] = components_code

        # Generate individual mechanic files for complex mechanics
        for mech_name in mechanic_names:
            template = get_mechanic_code(mech_name)
            if template and "component" in template:
                # Create individual file for significant components
                if len(template.get("component", "")) > 500:
                    file_name = mech_name.replace("_", "_") + ".dart"
                    component_code = f'''/// {mech_name.replace("_", " ").title()} Mechanic
/// 
/// {template.get("description", "Game mechanic implementation")}

import 'dart:math';
import 'package:flame/components.dart';
import 'package:flame/collisions.dart';
import 'package:flutter/material.dart';

{template["component"]}
'''
                    files[f"lib/game/mechanics/{file_name}"] = component_code

        return files

    async def _generate_main_game(self, game: Game) -> str:
        """Generate main FlameGame class."""
        game_name = game.name.replace(" ", "")
        
        try:
            return await self.ai_service.generate_dart_code(
                file_purpose=f"Main FlameGame class for {game.genre} game",
                game_context=game.gdd_spec,
                additional_instructions=f"""
Create a complete FlameGame subclass named {game_name}Game with:
1. Camera and world setup
2. Game state enum (playing, paused, gameOver, levelComplete)
3. Level loading from config
4. Score tracking
5. Lives system
6. Collision handling
7. Integration with GameController
8. Overlay management for UI
9. Reference to AnalyticsService for event logging

The game should be fully playable as a {game.genre} game.
""",
            )
        except Exception:
            return self._get_fallback_main_game(game)

    def _get_fallback_main_game(self, game: Game) -> str:
        """Fallback main game implementation."""
        game_name = game.name.replace(" ", "")
        return f'''import 'package:flame/game.dart';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import 'components/player.dart';
import 'components/spawner.dart';
import 'game_controller.dart';
import 'input_handler.dart';
import '../services/analytics_service.dart';
import '../config/levels.dart';

enum GameState {{ playing, paused, gameOver, levelComplete }}

class {game_name}Game extends FlameGame
    with HasCollisionDetection, TapCallbacks, DragCallbacks {{
  
  late Player player;
  late Spawner spawner;
  late GameController controller;
  late InputHandler inputHandler;
  late AnalyticsService analytics;
  
  GameState state = GameState.playing;
  int currentLevel = 1;
  int score = 0;
  int lives = 3;
  LevelConfig? levelConfig;

  @override
  Future<void> onLoad() async {{
    await super.onLoad();
    
    analytics = AnalyticsService();
    await analytics.initialize();
    
    controller = GameController(this);
    inputHandler = InputHandler(this);
    
    camera.viewfinder.anchor = Anchor.topLeft;
    
    await loadLevel(currentLevel);
    analytics.logGameStart();
  }}

  Future<void> loadLevel(int level) async {{
    currentLevel = level;
    levelConfig = LevelConfigs.getLevel(level);
    
    removeAll(children.whereType<PositionComponent>());
    
    player = Player(position: Vector2(size.x / 2, size.y - 100));
    add(player);
    
    spawner = Spawner(
      spawnRate: levelConfig?.obstacleSpeed ?? 1.0,
      gameSize: size,
    );
    add(spawner);
    
    score = 0;
    state = GameState.playing;
    
    analytics.logLevelStart(level);
    overlays.add('GameOverlay');
  }}

  @override
  void update(double dt) {{
    super.update(dt);
    if (state != GameState.playing) return;
    controller.update(dt);
  }}

  @override
  void onTapDown(TapDownEvent event) {{
    inputHandler.onTapDown(event.localPosition);
  }}

  @override
  void onDragUpdate(DragUpdateEvent event) {{
    inputHandler.onDrag(event.localDelta);
  }}

  void addScore(int points) {{
    score += points;
    if (levelConfig != null && score >= levelConfig!.targetScore) {{
      onLevelComplete();
    }}
  }}

  void loseLife() {{
    lives--;
    if (lives <= 0) {{
      onGameOver();
    }}
  }}

  void onLevelComplete() {{
    state = GameState.levelComplete;
    analytics.logLevelComplete(currentLevel, score, 0);
    overlays.add('LevelCompleteOverlay');
    overlays.remove('GameOverlay');
  }}

  void onGameOver() {{
    state = GameState.gameOver;
    analytics.logLevelFail(currentLevel, score, 'no_lives', 0);
    overlays.add('GameOverOverlay');
    overlays.remove('GameOverlay');
  }}

  void restartLevel() {{
    lives = 3;
    loadLevel(currentLevel);
    overlays.remove('GameOverOverlay');
    overlays.remove('LevelCompleteOverlay');
  }}

  void nextLevel() {{
    if (currentLevel < 10) {{
      loadLevel(currentLevel + 1);
      overlays.remove('LevelCompleteOverlay');
    }}
  }}

  void pauseGame() {{
    state = GameState.paused;
    pauseEngine();
    overlays.add('PauseOverlay');
  }}

  void resumeGame() {{
    state = GameState.playing;
    resumeEngine();
    overlays.remove('PauseOverlay');
  }}
}}
'''

    async def _generate_player(self, game: Game) -> str:
        """Generate player component based on genre."""
        genre = game.genre.lower()
        
        try:
            return await self.ai_service.generate_dart_code(
                file_purpose=f"Player component for {genre} game",
                game_context=game.gdd_spec,
                additional_instructions=f"""
Create a Player component for a {genre} game with:
1. Movement appropriate for the genre
2. Collision detection with obstacles and collectibles
3. Animation states
4. Health/damage system
5. Invulnerability frames after damage
""",
            )
        except Exception:
            return self._get_fallback_player(genre)

    def _get_fallback_player(self, genre: str) -> str:
        """Fallback player component."""
        return '''import 'package:flame/components.dart';
import 'package:flame/collisions.dart';
import 'package:flutter/material.dart';
import 'obstacle.dart';
import 'collectible.dart';
import '../game.dart';

class Player extends PositionComponent
    with HasGameRef<dynamic>, CollisionCallbacks {
  
  double speed = 200;
  Vector2 velocity = Vector2.zero();
  bool isInvulnerable = false;
  
  Player({required Vector2 position})
      : super(
          position: position,
          size: Vector2(50, 50),
          anchor: Anchor.center,
        );

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    add(RectangleHitbox());
  }

  @override
  void update(double dt) {
    super.update(dt);
    
    position += velocity * speed * dt;
    position.x = position.x.clamp(25, gameRef.size.x - 25);
    position.y = position.y.clamp(25, gameRef.size.y - 25);
    
    velocity *= 0.9;
  }

  @override
  void render(Canvas canvas) {
    final paint = Paint()
      ..color = isInvulnerable ? Colors.grey : Colors.blue;
    canvas.drawRect(size.toRect(), paint);
  }

  void moveLeft() => velocity.x = -1;
  void moveRight() => velocity.x = 1;
  void moveUp() => velocity.y = -1;
  void moveDown() => velocity.y = 1;

  @override
  void onCollision(Set<Vector2> points, PositionComponent other) {
    super.onCollision(points, other);
    
    if (other is Obstacle && !isInvulnerable) {
      takeDamage();
    } else if (other is Collectible) {
      other.collect();
      gameRef.addScore(other.value);
    }
  }

  void takeDamage() {
    if (isInvulnerable) return;
    
    gameRef.loseLife();
    isInvulnerable = true;
    
    Future.delayed(const Duration(seconds: 2), () {
      isInvulnerable = false;
    });
  }
}
'''

    async def _generate_obstacle(self, game: Game) -> str:
        """Generate obstacle component."""
        return '''import 'package:flame/components.dart';
import 'package:flame/collisions.dart';
import 'package:flutter/material.dart';

class Obstacle extends PositionComponent with CollisionCallbacks {
  final double moveSpeed;
  final Vector2 direction;

  Obstacle({
    required Vector2 position,
    required Vector2 size,
    this.moveSpeed = 150,
    this.direction = const Vector2(0, 1),
  }) : super(
          position: position,
          size: size,
          anchor: Anchor.center,
        );

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    add(RectangleHitbox());
  }

  @override
  void update(double dt) {
    super.update(dt);
    position += direction * moveSpeed * dt;
    
    if (position.y > 900 || position.y < -100 ||
        position.x > 500 || position.x < -100) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    canvas.drawRect(
      size.toRect(),
      Paint()..color = Colors.red,
    );
  }
}
'''

    async def _generate_spawner(self, game: Game) -> str:
        """Generate obstacle spawner."""
        return '''import 'dart:math';
import 'package:flame/components.dart';
import 'obstacle.dart';
import 'collectible.dart';

class Spawner extends Component with HasGameRef {
  final double spawnRate;
  final Vector2 gameSize;
  double _timer = 0;
  final Random _random = Random();

  Spawner({
    required this.spawnRate,
    required this.gameSize,
  });

  @override
  void update(double dt) {
    super.update(dt);
    
    _timer += dt;
    
    if (_timer >= (1.0 / spawnRate)) {
      _timer = 0;
      _spawn();
    }
  }

  void _spawn() {
    final x = 50 + _random.nextDouble() * (gameSize.x - 100);
    
    if (_random.nextDouble() > 0.3) {
      final obstacle = Obstacle(
        position: Vector2(x, -50),
        size: Vector2(40 + _random.nextDouble() * 30, 40 + _random.nextDouble() * 30),
        moveSpeed: 100 + _random.nextDouble() * 100,
      );
      gameRef.add(obstacle);
    } else {
      final collectible = Collectible(
        position: Vector2(x, -30),
        value: 10 + _random.nextInt(20),
      );
      gameRef.add(collectible);
    }
  }
}
'''

    async def _generate_collectible(self, game: Game) -> str:
        """Generate collectible component."""
        return '''import 'package:flame/components.dart';
import 'package:flame/collisions.dart';
import 'package:flutter/material.dart';

class Collectible extends PositionComponent with CollisionCallbacks {
  final int value;
  double _floatOffset = 0;

  Collectible({
    required Vector2 position,
    this.value = 10,
  }) : super(
          position: position,
          size: Vector2(30, 30),
          anchor: Anchor.center,
        );

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    add(CircleHitbox());
  }

  @override
  void update(double dt) {
    super.update(dt);
    
    position.y += 80 * dt;
    
    _floatOffset += dt * 5;
    position.x += (0.5 * ((_floatOffset % 2) < 1 ? 1 : -1));
    
    if (position.y > 900) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    canvas.drawCircle(
      Offset(size.x / 2, size.y / 2),
      size.x / 2,
      Paint()..color = Colors.amber,
    );
  }

  void collect() {
    removeFromParent();
  }
}
'''

    async def _generate_game_controller(self, game: Game) -> str:
        """Generate game controller."""
        return '''import 'game.dart';

class GameController {
  final dynamic game;
  double _elapsedTime = 0;

  GameController(this.game);

  void update(double dt) {
    _elapsedTime += dt;
    
    // Add game-specific logic here
    // e.g., difficulty scaling, special events, etc.
  }

  double get elapsedTime => _elapsedTime;

  void reset() {
    _elapsedTime = 0;
  }
}
'''

    def _generate_input_handler(self, game: Game) -> str:
        """Generate input handler based on GDD mechanics."""
        mechanics = game.gdd_spec.get("mechanics", {}) if game.gdd_spec else {}
        primary_action = game.gdd_spec.get("core_loop", {}).get("primary_action", "tap") if game.gdd_spec else "tap"
        
        return f'''import 'package:flame/components.dart';
import 'game.dart';

class InputHandler {{
  final dynamic game;

  InputHandler(this.game);

  void onTapDown(Vector2 position) {{
    // Primary action: {primary_action}
    final player = game.player;
    
    // Move player towards tap position
    if (position.x < game.size.x / 2) {{
      player.moveLeft();
    }} else {{
      player.moveRight();
    }}
  }}

  void onDrag(Vector2 delta) {{
    final player = game.player;
    
    if (delta.x.abs() > delta.y.abs()) {{
      if (delta.x < 0) {{
        player.moveLeft();
      }} else {{
        player.moveRight();
      }}
    }} else {{
      if (delta.y < 0) {{
        player.moveUp();
      }} else {{
        player.moveDown();
      }}
    }}
  }}
}}
'''

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate core prototype."""
        errors = []
        warnings = []

        files = artifacts.get("files", [])
        
        required = [
            "lib/game/game.dart",
            "lib/game/components/player.dart",
        ]

        for req in required:
            if req not in files:
                errors.append(f"Missing: {req}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback core prototype."""
        self.logger.info("core_prototype_rollback", game_id=str(game.id))
        return True
