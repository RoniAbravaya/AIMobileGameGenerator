# Similarity Check System

## Overview

GameFactory includes a **similarity check system** that ensures diversity across generated games. After each game's GDD (Game Design Document) is generated in Step 1, the system compares it against all existing games. If the new game is **more than 80% similar** to any existing game, it automatically regenerates with different parameters.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 1: PRE-PRODUCTION                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────────┐                                                    │
│   │ Generate GDD  │ ←── Attempt 1                                      │
│   └───────┬───────┘                                                    │
│           │                                                            │
│           ▼                                                            │
│   ┌───────────────────┐                                                │
│   │ Similarity Check  │                                                │
│   │ Against All Games │                                                │
│   └─────────┬─────────┘                                                │
│             │                                                          │
│      ┌──────┴──────┐                                                   │
│      │             │                                                   │
│   < 80%         >= 80%                                                 │
│      │             │                                                   │
│      ▼             ▼                                                   │
│  ┌────────┐   ┌──────────────┐                                        │
│  │ ACCEPT │   │ REGENERATE   │                                        │
│  │  GDD   │   │ with new     │                                        │
│  └────────┘   │ constraints  │                                        │
│               └──────┬───────┘                                        │
│                      │                                                 │
│                      └──► Attempt 2, 3, ... up to 5                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Similarity Calculation

The similarity score is a weighted combination of multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Genre | 20% | Exact match = 1.0, different = 0.0 |
| Mechanics | 25% | Jaccard similarity of selected mechanics |
| Core Loop | 15% | Primary action, reward trigger, session length |
| Visual Style | 15% | Art style, UI theme, audio, color palette |
| Difficulty | 10% | Difficulty factors comparison |
| Economy | 10% | Currency, earn rates |
| Name | 5% | Word overlap in game names |

### Formula

```
similarity_score = Σ(factor_score × weight)
```

### Jaccard Similarity (for mechanics)

```
J(A, B) = |A ∩ B| / |A ∪ B|
```

## Regeneration Process

When a game is too similar (≥80%), the system:

1. **Records the rejected GDD** in `similarity_checks` table
2. **Adds constraints** to avoid the same choices:
   - Excluded mechanics (from the similar attempt)
   - Excluded art styles
3. **Generates a new GDD** with:
   - Different mechanics selection
   - Different art style
   - Varied session length
   - Varied economy settings
4. **Repeats** up to 5 attempts (configurable)

### Constraints Applied Per Attempt

| Attempt | Changes |
|---------|---------|
| 1 | Base generation |
| 2 | Exclude mechanics from attempt 1, new art style |
| 3 | Exclude mechanics from attempts 1-2, new art style |
| 4 | Exclude mechanics from attempts 1-3, new art style |
| 5 | Final attempt with maximum constraints |

## Configuration

Constants in `backend/app/services/similarity_service.py`:

```python
SIMILARITY_THRESHOLD = 0.80  # 80%
MAX_REGENERATION_ATTEMPTS = 5
```

## Database Tables

### similarity_checks

Stores all similarity check results:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| game_id | UUID | Game being checked |
| is_similar | Boolean | Whether threshold exceeded |
| similarity_score | Float | Calculated score (0.0 - 1.0) |
| most_similar_game_id | UUID | Most similar existing game |
| breakdown | JSON | Score breakdown by factor |
| attempt_number | Integer | Which generation attempt |
| triggered_regeneration | Boolean | Whether regeneration triggered |
| rejected_gdd | JSON | The rejected GDD (if similar) |

### regeneration_logs

Tracks regeneration attempts:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| game_id | UUID | Game being regenerated |
| batch_id | UUID | Parent batch (if applicable) |
| attempt_number | Integer | Attempt number |
| reason | String | Why regeneration triggered |
| similarity_score | Float | Score that triggered regeneration |
| similar_to_game_id | UUID | The game it was similar to |
| constraints_applied | JSON | What was changed |
| success | Boolean | Whether final attempt succeeded |

## API Endpoints

### GET /api/v1/similarity/config

Get current similarity configuration.

```json
{
  "threshold": 0.8,
  "max_regeneration_attempts": 5
}
```

### GET /api/v1/similarity/checks/{game_id}

Get all similarity checks for a game.

### GET /api/v1/similarity/regenerations/{game_id}

Get regeneration history for a game.

### GET /api/v1/similarity/stats

Get aggregate statistics:

```json
{
  "total_similarity_checks": 150,
  "checks_triggering_regeneration": 23,
  "regeneration_rate": 0.153,
  "average_similarity_score": 0.45,
  "total_regeneration_attempts": 31,
  "threshold": 0.8
}
```

## Example Workflow

1. **Batch Created**: 10 games requested
2. **Game 1**: 
   - GDD generated (attempt 1)
   - Similarity check: 0.0 (no other games) → **ACCEPTED**
3. **Game 2**:
   - GDD generated (attempt 1)
   - Similarity check: 0.85 with Game 1 → **REGENERATE**
   - GDD generated (attempt 2, different mechanics/style)
   - Similarity check: 0.62 with Game 1 → **ACCEPTED**
4. **Game 3**:
   - GDD generated (attempt 1)
   - Similarity check: 0.72 with Game 2 → **ACCEPTED**

## Edge Cases

### All Attempts Exhausted

If similarity is still ≥80% after 5 attempts:
- The last GDD is accepted with a **warning flag**
- `gdd_spec._similarity_warning = True`
- Processing continues (better to have similar game than none)

### No Existing Games

If no games exist to compare against:
- Similarity score = 0.0
- Always accepted (first game is unique by definition)

### Same Batch Games

Games within the same batch **are compared** against each other as they are generated sequentially. This ensures diversity within a single batch.

## Monitoring

Watch for high regeneration rates in the `/similarity/stats` endpoint:
- Rate > 50% suggests need for more diverse mechanics/styles
- Average similarity > 0.7 suggests games are becoming too similar

## Future Enhancements

- [ ] Configurable threshold via API
- [ ] Per-genre similarity thresholds
- [ ] Machine learning-based similarity detection
- [ ] Visual asset similarity (image hashing)
- [ ] Cross-batch diversity enforcement
