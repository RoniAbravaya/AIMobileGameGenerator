# Game Templates

This directory contains the base Flutter + Flame game templates that are cloned/forked for each generated game.

## Template Sources

Templates are derived from official Flame repositories:
- https://github.com/orgs/flame-games/repositories

## Available Templates

| Genre | Template | Source |
|-------|----------|--------|
| Platformer | `platformer/` | flame-games/endless_runner |
| Runner | `runner/` | flame-games/endless_runner |
| Puzzle | `puzzle/` | flame-games/snake |
| Shooter | `shooter/` | flame-games/asteroids |
| Casual | `casual/` | flame-games/flappy_bird |

## Template Structure

Each template follows the GameFactory standard architecture:

```
template/
├── lib/
│   ├── main.dart
│   ├── game/
│   │   ├── game.dart          # FlameGame subclass
│   │   ├── components/        # Flame components
│   │   └── scenes/            # Game scenes
│   ├── services/
│   │   ├── analytics_service.dart
│   │   ├── ad_service.dart
│   │   └── storage_service.dart
│   ├── ui/
│   │   └── overlays/          # Flutter UI
│   └── config/
│       ├── levels.dart
│       └── constants.dart
├── assets/
│   ├── images/
│   └── audio/
├── test/
├── pubspec.yaml
├── android/
└── ios/
```

## Cloning Templates

Templates are cloned programmatically by Step 2 (Project Setup):

```python
# In step_02_project_setup.py
template = FLAME_TEMPLATES.get(genre, FLAME_TEMPLATES["default"])
# Clone from GitHub, adapt to GameFactory structure
```

## Customization Points

When adapting a template for a new game:

1. **pubspec.yaml** - Update name, description, dependencies
2. **lib/config/constants.dart** - Game-specific constants
3. **lib/config/levels.dart** - Level configurations
4. **assets/** - Replace with AI-generated assets
5. **android/app/build.gradle** - App ID, signing config
