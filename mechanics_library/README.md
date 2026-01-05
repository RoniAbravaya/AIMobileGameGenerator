# Mechanics Library

This directory contains the indexed mechanics from Flame examples that can be used for game generation.

## Source

All mechanics are sourced from:
- **Flame Examples**: https://examples.flame-engine.org/
- **Flame Games**: https://github.com/orgs/flame-games/repositories

## Structure

```
mechanics_library/
├── README.md
├── mechanics.json         # Master list of all mechanics
├── platformer/           # Platformer mechanics
├── runner/               # Runner mechanics
├── puzzle/               # Puzzle mechanics
├── shooter/              # Shooter mechanics
└── casual/               # Casual game mechanics
```

## Mechanic Schema

Each mechanic entry includes:

```json
{
  "name": "Mechanic Name",
  "source_url": "https://examples.flame-engine.org/example",
  "flame_example": "example_name",
  "genre_tags": ["platformer", "action"],
  "input_model": "tap|drag|joystick|tilt|swipe|multi_touch",
  "complexity": 1-5,
  "description": "What the mechanic does",
  "compatible_with_ads": true,
  "compatible_with_levels": true
}
```

## Adding New Mechanics

1. Identify the Flame example
2. Create entry in `mechanics.json`
3. Add code snippet if needed
4. Tag with appropriate genres
5. Rate complexity

## Complexity Ratings

- **1**: Simple tap/click actions
- **2**: Basic movement (jump, move)
- **3**: Combined inputs (tap + drag)
- **4**: Physics-based interactions
- **5**: Complex multi-touch or tilt controls
