"""
Mechanic Code Templates

Provides actual Dart/Flutter code templates for each mechanic type.
These templates are used during code generation to ensure proper
implementation of selected mechanics.
"""

from typing import Dict, Optional


# Dictionary mapping mechanic names to their code implementations
MECHANIC_CODE_TEMPLATES: Dict[str, Dict[str, str]] = {
    "tap_jump": {
        "description": "Tap anywhere to jump",
        "player_mixin": """
mixin JumpableMixin on PositionComponent {
  double jumpForce = -400;
  double gravity = 800;
  double velocityY = 0;
  bool isGrounded = true;
  
  void jump() {
    if (isGrounded) {
      velocityY = jumpForce;
      isGrounded = false;
    }
  }
  
  void applyGravity(double dt) {
    if (!isGrounded) {
      velocityY += gravity * dt;
      position.y += velocityY * dt;
    }
  }
  
  void land(double groundY) {
    if (position.y >= groundY) {
      position.y = groundY;
      velocityY = 0;
      isGrounded = true;
    }
  }
}
""",
        "input_handler": """
  void onTap(Vector2 position) {
    if (player is JumpableMixin) {
      (player as JumpableMixin).jump();
    }
  }
""",
        "update_code": """
    // Apply jump physics
    if (player is JumpableMixin) {
      (player as JumpableMixin).applyGravity(dt);
      (player as JumpableMixin).land(groundY);
    }
""",
    },
    
    "lane_switch": {
        "description": "Swipe to change lanes",
        "player_mixin": """
mixin LaneSwitchMixin on PositionComponent {
  int currentLane = 1; // 0 = left, 1 = center, 2 = right
  static const int laneCount = 3;
  late double laneWidth;
  double switchSpeed = 500;
  double targetX = 0;
  
  void initLanes(double gameWidth) {
    laneWidth = gameWidth / laneCount;
    targetX = getLaneX(currentLane);
    position.x = targetX;
  }
  
  double getLaneX(int lane) {
    return laneWidth * lane + laneWidth / 2;
  }
  
  void switchLane(int direction) {
    final newLane = (currentLane + direction).clamp(0, laneCount - 1);
    if (newLane != currentLane) {
      currentLane = newLane;
      targetX = getLaneX(currentLane);
    }
  }
  
  void updateLanePosition(double dt) {
    if ((position.x - targetX).abs() > 1) {
      final direction = (targetX - position.x).sign;
      position.x += direction * switchSpeed * dt;
    } else {
      position.x = targetX;
    }
  }
}
""",
        "input_handler": """
  void onHorizontalSwipe(double deltaX) {
    if (player is LaneSwitchMixin) {
      if (deltaX > 50) {
        (player as LaneSwitchMixin).switchLane(1); // Right
      } else if (deltaX < -50) {
        (player as LaneSwitchMixin).switchLane(-1); // Left
      }
    }
  }
""",
        "update_code": """
    // Update lane position
    if (player is LaneSwitchMixin) {
      (player as LaneSwitchMixin).updateLanePosition(dt);
    }
""",
    },
    
    "drag_aim": {
        "description": "Drag to aim, release to launch",
        "component": """
class DragAimComponent extends PositionComponent {
  Vector2 dragStart = Vector2.zero();
  Vector2 dragCurrent = Vector2.zero();
  bool isDragging = false;
  double maxDragDistance = 150;
  
  void startDrag(Vector2 position) {
    dragStart = position;
    dragCurrent = position;
    isDragging = true;
  }
  
  void updateDrag(Vector2 position) {
    if (isDragging) {
      dragCurrent = position;
      // Clamp drag distance
      final delta = dragCurrent - dragStart;
      if (delta.length > maxDragDistance) {
        dragCurrent = dragStart + delta.normalized() * maxDragDistance;
      }
    }
  }
  
  Vector2 endDrag() {
    isDragging = false;
    final launchVector = (dragStart - dragCurrent) * 5; // Launch opposite to drag
    dragStart = Vector2.zero();
    dragCurrent = Vector2.zero();
    return launchVector;
  }
  
  @override
  void render(Canvas canvas) {
    if (isDragging) {
      // Draw aim line
      canvas.drawLine(
        dragStart.toOffset(),
        dragCurrent.toOffset(),
        Paint()
          ..color = Colors.white
          ..strokeWidth = 2,
      );
    }
  }
}
""",
        "input_handler": """
  DragAimComponent? aimComponent;
  
  void onDragStart(Vector2 position) {
    aimComponent?.startDrag(position);
  }
  
  void onDragUpdate(Vector2 position) {
    aimComponent?.updateDrag(position);
  }
  
  void onDragEnd() {
    final launchVector = aimComponent?.endDrag();
    if (launchVector != null) {
      launchProjectile(launchVector);
    }
  }
""",
    },
    
    "joystick_control": {
        "description": "Virtual joystick for movement",
        "component": """
class VirtualJoystick extends PositionComponent with HasGameRef {
  late final JoystickComponent joystick;
  
  @override
  Future<void> onLoad() async {
    final knobPaint = Paint()..color = Colors.blue.withOpacity(0.8);
    final backgroundPaint = Paint()..color = Colors.grey.withOpacity(0.5);
    
    joystick = JoystickComponent(
      knob: CircleComponent(radius: 25, paint: knobPaint),
      background: CircleComponent(radius: 60, paint: backgroundPaint),
      margin: const EdgeInsets.only(left: 40, bottom: 40),
    );
    
    await add(joystick);
  }
  
  Vector2 get direction => joystick.relativeDelta;
  bool get isMoving => !joystick.delta.isZero();
}
""",
        "player_mixin": """
mixin JoystickControlMixin on PositionComponent {
  double moveSpeed = 200;
  
  void moveWithJoystick(Vector2 joystickDelta, double dt) {
    if (!joystickDelta.isZero()) {
      position += joystickDelta * moveSpeed * dt;
    }
  }
}
""",
        "update_code": """
    // Joystick movement
    if (player is JoystickControlMixin && joystick != null) {
      (player as JoystickControlMixin).moveWithJoystick(joystick.direction, dt);
    }
""",
    },
    
    "collision_detection": {
        "description": "Standard collision detection setup",
        "game_mixin": """
// Add HasCollisionDetection to your FlameGame class
// class MyGame extends FlameGame with HasCollisionDetection
""",
        "component": """
class CollidableComponent extends PositionComponent with CollisionCallbacks {
  final List<String> collidesWith;
  
  CollidableComponent({
    required Vector2 position,
    required Vector2 size,
    this.collidesWith = const [],
  }) : super(position: position, size: size);
  
  @override
  Future<void> onLoad() async {
    await add(RectangleHitbox());
  }
  
  @override
  void onCollision(Set<Vector2> points, PositionComponent other) {
    super.onCollision(points, other);
    handleCollision(other);
  }
  
  void handleCollision(PositionComponent other) {
    // Override in subclass
  }
}
""",
    },
    
    "spawner": {
        "description": "Spawn objects at intervals",
        "component": """
class SpawnerComponent extends Component with HasGameRef {
  final double spawnInterval;
  final Vector2 spawnArea;
  double _timer = 0;
  final Random _random = Random();
  
  SpawnerComponent({
    required this.spawnInterval,
    required this.spawnArea,
  });
  
  @override
  void update(double dt) {
    _timer += dt;
    if (_timer >= spawnInterval) {
      _timer = 0;
      spawn();
    }
  }
  
  void spawn() {
    final x = _random.nextDouble() * spawnArea.x;
    final y = -50; // Spawn above screen
    
    final spawnedObject = createSpawnedObject(Vector2(x, y));
    gameRef.add(spawnedObject);
  }
  
  PositionComponent createSpawnedObject(Vector2 position) {
    // Override to create specific objects
    throw UnimplementedError();
  }
}
""",
    },
    
    "parallax_scrolling": {
        "description": "Multi-layer scrolling background",
        "component": """
class ParallaxBackgroundComponent extends ParallaxComponent {
  @override
  Future<void> onLoad() async {
    parallax = await gameRef.loadParallax(
      [
        ParallaxImageData('bg_far.png'),
        ParallaxImageData('bg_mid.png'),
        ParallaxImageData('bg_near.png'),
      ],
      baseVelocity: Vector2(20, 0),
      velocityMultiplierDelta: Vector2(1.8, 0),
    );
  }
}
""",
    },
    
    "timer_countdown": {
        "description": "Countdown timer for levels",
        "component": """
class CountdownTimer extends Component with HasGameRef {
  final double initialTime;
  double remainingTime;
  final VoidCallback onTimeUp;
  bool isPaused = false;
  
  CountdownTimer({
    required this.initialTime,
    required this.onTimeUp,
  }) : remainingTime = initialTime;
  
  @override
  void update(double dt) {
    if (isPaused) return;
    
    remainingTime -= dt;
    if (remainingTime <= 0) {
      remainingTime = 0;
      onTimeUp();
    }
  }
  
  String get formattedTime {
    final minutes = (remainingTime / 60).floor();
    final seconds = (remainingTime % 60).floor();
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
  
  void reset() {
    remainingTime = initialTime;
    isPaused = false;
  }
  
  void pause() => isPaused = true;
  void resume() => isPaused = false;
}
""",
    },
    
    "score_system": {
        "description": "Score tracking and display",
        "component": """
class ScoreComponent extends PositionComponent with HasGameRef {
  int _score = 0;
  int _highScore = 0;
  int _multiplier = 1;
  double _multiplierTimer = 0;
  
  int get score => _score;
  int get highScore => _highScore;
  int get multiplier => _multiplier;
  
  void addScore(int points) {
    _score += points * _multiplier;
    if (_score > _highScore) {
      _highScore = _score;
    }
  }
  
  void setMultiplier(int value, double duration) {
    _multiplier = value;
    _multiplierTimer = duration;
  }
  
  @override
  void update(double dt) {
    if (_multiplierTimer > 0) {
      _multiplierTimer -= dt;
      if (_multiplierTimer <= 0) {
        _multiplier = 1;
      }
    }
  }
  
  void reset() {
    _score = 0;
    _multiplier = 1;
    _multiplierTimer = 0;
  }
}
""",
    },
    
    "health_system": {
        "description": "Health/lives management",
        "component": """
class HealthComponent extends Component {
  final int maxHealth;
  int _currentHealth;
  bool isInvulnerable = false;
  double invulnerabilityDuration = 2.0;
  double _invulnerabilityTimer = 0;
  
  final void Function()? onDeath;
  final void Function(int health)? onHealthChanged;
  
  HealthComponent({
    required this.maxHealth,
    this.onDeath,
    this.onHealthChanged,
  }) : _currentHealth = maxHealth;
  
  int get currentHealth => _currentHealth;
  bool get isDead => _currentHealth <= 0;
  double get healthPercent => _currentHealth / maxHealth;
  
  void takeDamage(int amount) {
    if (isInvulnerable || isDead) return;
    
    _currentHealth = (_currentHealth - amount).clamp(0, maxHealth);
    onHealthChanged?.call(_currentHealth);
    
    if (isDead) {
      onDeath?.call();
    } else {
      startInvulnerability();
    }
  }
  
  void heal(int amount) {
    _currentHealth = (_currentHealth + amount).clamp(0, maxHealth);
    onHealthChanged?.call(_currentHealth);
  }
  
  void startInvulnerability() {
    isInvulnerable = true;
    _invulnerabilityTimer = invulnerabilityDuration;
  }
  
  @override
  void update(double dt) {
    if (isInvulnerable) {
      _invulnerabilityTimer -= dt;
      if (_invulnerabilityTimer <= 0) {
        isInvulnerable = false;
      }
    }
  }
  
  void reset() {
    _currentHealth = maxHealth;
    isInvulnerable = false;
    _invulnerabilityTimer = 0;
  }
}
""",
    },
    
    "card_flip": {
        "description": "Card flipping for memory games",
        "component": """
class FlipCard extends PositionComponent with TapCallbacks {
  final Sprite frontSprite;
  final Sprite backSprite;
  bool isFaceUp = false;
  bool isMatched = false;
  final int cardId;
  double _flipProgress = 0;
  bool _isFlipping = false;
  
  FlipCard({
    required this.frontSprite,
    required this.backSprite,
    required this.cardId,
    required Vector2 position,
    required Vector2 size,
  }) : super(position: position, size: size);
  
  void flip() {
    if (_isFlipping || isMatched) return;
    _isFlipping = true;
  }
  
  @override
  void update(double dt) {
    if (_isFlipping) {
      _flipProgress += dt * 4; // Flip speed
      
      if (_flipProgress >= 0.5 && !isFaceUp) {
        isFaceUp = true;
      }
      
      if (_flipProgress >= 1.0) {
        _flipProgress = 0;
        _isFlipping = false;
      }
    }
  }
  
  @override
  void render(Canvas canvas) {
    final scale = (_flipProgress < 0.5)
        ? 1 - _flipProgress * 2
        : (_flipProgress - 0.5) * 2;
    
    canvas.save();
    canvas.scale(scale, 1);
    
    final sprite = isFaceUp ? frontSprite : backSprite;
    sprite.render(canvas, size: size);
    
    canvas.restore();
  }
  
  @override
  void onTapUp(TapUpEvent event) {
    flip();
  }
}
""",
    },
}


def get_mechanic_code(mechanic_name: str) -> Optional[Dict[str, str]]:
    """Get code template for a mechanic by name."""
    return MECHANIC_CODE_TEMPLATES.get(mechanic_name)


def get_all_mechanic_codes() -> Dict[str, Dict[str, str]]:
    """Get all mechanic code templates."""
    return MECHANIC_CODE_TEMPLATES


def get_mechanic_component_code(mechanic_name: str) -> Optional[str]:
    """Get just the main component code for a mechanic."""
    template = MECHANIC_CODE_TEMPLATES.get(mechanic_name)
    if not template:
        return None
    return template.get("component") or template.get("player_mixin")


def combine_mechanics_code(mechanic_names: list) -> Dict[str, list]:
    """Combine code from multiple mechanics into organized sections."""
    result = {
        "imports": [],
        "mixins": [],
        "components": [],
        "update_code": [],
        "input_handlers": [],
    }
    
    for name in mechanic_names:
        template = MECHANIC_CODE_TEMPLATES.get(name)
        if not template:
            continue
            
        if "player_mixin" in template:
            result["mixins"].append(template["player_mixin"])
        if "component" in template:
            result["components"].append(template["component"])
        if "update_code" in template:
            result["update_code"].append(template["update_code"])
        if "input_handler" in template:
            result["input_handlers"].append(template["input_handler"])
    
    return result
