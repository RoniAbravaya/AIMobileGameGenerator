# GameFactory - AI Architecture Overview

## Project Purpose

GameFactory is an automated Flutter + Flame mobile game generation engine that creates games through a strict 12-step workflow. Each generated game gets its own GitHub repository, automated builds, analytics integration, and performance tracking for continuous learning.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GameFactory Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   Next.js    │    │   FastAPI    │    │      Celery Workers          │  │
│  │   Frontend   │◄──►│   Backend    │◄──►│  (Game Generation Pipeline)  │  │
│  │   :3000      │    │    :8000     │    │                              │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┬───────────────┘  │
│                             │                           │                   │
│                             ▼                           ▼                   │
│                    ┌──────────────┐            ┌──────────────┐            │
│                    │  PostgreSQL  │            │    Redis     │            │
│                    │    :5432     │            │    :6379     │            │
│                    └──────────────┘            └──────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | FastAPI (Python 3.11) | REST API, business logic |
| Workers | Celery + Redis | Async task processing |
| Database | PostgreSQL 15 | Persistent storage |
| Frontend | Next.js 14 (TypeScript) | Dashboard UI |
| Games | Flutter + Flame | Mobile game framework |
| Ads | Google Mobile Ads | Rewarded ad monetization |
| Analytics | Firebase Analytics | Event tracking |

## Directory Structure

```
/workspace
├── backend/                    # FastAPI backend service
│   ├── app/
│   │   ├── api/v1/            # REST endpoints (batches, games, events, metrics)
│   │   ├── core/              # Config, state machine
│   │   ├── db/                # Database session, migrations
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic (BatchService, GameService, etc.)
│   │   ├── workers/           # Celery tasks and step executors
│   │   └── utils/
│   ├── alembic/               # Database migrations
│   ├── tests/
│   └── requirements.txt
├── frontend/                   # Next.js dashboard
│   └── src/
│       ├── app/               # Next.js app router pages
│       ├── components/        # React components
│       ├── lib/               # API client, utilities
│       └── types/             # TypeScript types
├── game_templates/            # Flame game templates (to be cloned)
├── mechanics_library/         # Indexed Flame mechanics (JSON)
├── asset_generation/          # AI asset pipelines (to be implemented)
├── docs/                      # Architecture documentation
├── docker-compose.yml
└── README.md
```

## Core Workflows

### 12-Step Game Generation Pipeline

Each step is implemented as a **state machine** with validation:

1. **Pre-Production** - Generate GDD-lite (genre, mechanics, analytics plan) + **SIMILARITY CHECK**
2. **Project Setup** - Clone Flame template, create GitHub repo
3. **Architecture** - Enforce standard layers, domain tests
4. **Analytics Design** - Generate event specification
5. **Analytics Impl** - Implement analytics wrapper
6. **Core Prototype** - Main mechanic loop with placeholders
7. **Asset Generation** - AI-generated art/audio
8. **Vertical Slice** - One polished level
9. **Content Production** - 10 levels with ad gating
10. **Testing** - Unit, integration, QA
11. **Release Prep** - Optimization, signing
12. **Post-Launch** - Analytics aggregation, learning loop

### Similarity Check (Step 1 Enhancement)

After GDD generation, each game is checked for similarity against all existing games:

- **Threshold**: 80% - games above this trigger automatic regeneration
- **Max Attempts**: 5 regeneration attempts before accepting with warning
- **Factors Compared**: Genre (20%), Mechanics (25%), Core Loop (15%), Visual Style (15%), Difficulty (10%), Economy (10%), Name (5%)
- **Result**: Ensures diversity across all generated games

If too similar, the system regenerates with:
- Different mechanics selection
- Different art style
- Varied session length and economy settings

See `docs/SIMILARITY_CHECK.md` for complete documentation.

### State Machine Flow

```
[CREATED] → [STEP_1_PENDING] → [STEP_1_RUNNING] → [STEP_1_COMPLETED]
                                       ↓ (failure)
                              [STEP_1_FAILED] → retry → [STEP_1_PENDING]
                                       
[STEP_N_COMPLETED] → [STEP_N+1_PENDING] → ...
```

## Key Services

### BatchService (`backend/app/services/batch_service.py`)
- Create batches of 10 games
- Manage batch lifecycle
- Trigger async processing via Celery

### GameService (`backend/app/services/game_service.py`)
- Individual game CRUD
- Step management and transitions
- GitHub repo association

### MechanicService (`backend/app/services/mechanic_service.py`)
- Manage Flame mechanics library
- Recommend mechanics based on learning weights
- Filter by genre, complexity, input model

### AnalyticsService (`backend/app/services/analytics_service.py`)
- Record events from games
- Aggregate daily metrics
- Calculate game scores for ranking

### AIService (`backend/app/services/ai_service.py`) ✅ Claude AI Primary
- **Primary Provider**: Anthropic Claude (claude-3-5-sonnet by default)
- **Fallback Provider**: OpenAI GPT-4 (if configured)
- GDD generation with structured JSON output
- Dart/Flutter code generation
- Level configuration generation
- Asset prompt generation for DALL-E
- Automatic fallback between providers
- Configurable Claude model (opus/sonnet/haiku)

### GitHubService (`backend/app/services/github_service.py`) ✅ NEW
- Full repository creation via GitHub API
- Template cloning with subpath extraction
- Multi-file commits via Git Data API
- GitHub Actions workflow setup
- Release and asset management
- Workflow triggering for builds

### TemplateService (`backend/app/services/template_service.py`) ✅ NEW
- Clone official Flame templates from GitHub
- Create Flutter project structure
- Inject GameFactory architecture (services, overlays, screens)
- Generate Dart code for game components, scenes, models
- Pubspec.yaml and configuration file generation

### AssetService (`backend/app/services/asset_service.py`) ✅ NEW
- AI image generation via DALL-E 3
- Sprite, background, UI, and icon generation
- Placeholder audio file creation
- Texture atlas generation
- Mobile optimization (image compression)
- Asset metadata tracking in database

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/batches` | Create new batch |
| GET | `/api/v1/batches/{id}` | Get batch with games |
| POST | `/api/v1/batches/{id}/start` | Start processing |
| GET | `/api/v1/games` | List games |
| GET | `/api/v1/games/{id}` | Get game details |
| POST | `/api/v1/events` | Record analytics event |
| GET | `/api/v1/metrics` | Get metrics summary |
| GET | `/api/v1/mechanics` | List mechanics |

## Database Models

- **Batch** - Groups of games generated together
- **Game** - Individual game with GDD, status, GitHub info
- **GameStep** - Tracks each workflow step
- **Mechanic** - Flame mechanics library
- **GameAsset** - AI-generated assets
- **GameBuild** - GitHub Actions build tracking
- **AnalyticsEvent** - Raw events from games
- **GameMetrics** - Aggregated daily metrics
- **LearningWeight** - Mechanic performance weights

## Monetization Rules

- **Levels 1-3**: Free to play
- **Levels 4-10**: Unlock by watching rewarded ad after completing previous level
- **Local persistence**: Unlock state saved with SharedPreferences

## Analytics Events (Mandatory)

```
game_start, level_start, level_complete, level_fail,
unlock_prompt_shown, rewarded_ad_started, rewarded_ad_completed,
rewarded_ad_failed, level_unlocked
```

## Running the System

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Seed mechanics library
docker-compose exec backend python -m app.db.seed

# Access services
# - API: http://localhost:8000/docs
# - Frontend: http://localhost:3000
# - Flower (Celery monitoring): http://localhost:5555
```

## Development Guidelines

### Code Style
- Python: Black formatter, type hints, pydantic validation
- TypeScript: Strict mode, ESLint
- Commits: Conventional commits (feat:, fix:, etc.)

### Adding New Mechanics
1. Add entry to `mechanics_library/mechanics.json`
2. Run seed script to import
3. Mechanics appear in recommendations based on genre

### Adding New Step Executors
1. Create `step_NN_name.py` in `backend/app/workers/step_executors/`
2. Implement `execute()` and `validate()` methods
3. Register in `step_executors/__init__.py`

## Security

- Secrets via environment variables (never committed)
- GitHub PAT with minimal repo permissions
- API rate limiting on event ingestion
- JWT authentication (to be implemented)

## Implemented Step Executors

| Step | Name | Status | Description |
|------|------|--------|-------------|
| 1 | Pre-Production | ✅ Full | AI-powered GDD generation with similarity checking |
| 2 | Project Setup | ✅ Full | Real GitHub repo creation, template cloning |
| 3 | Architecture | ✅ Full | AI code generation, GitHub commits |
| 4 | Analytics Design | ✅ Full | Event specification, funnels, documentation |
| 5 | Analytics Impl | ✅ Full | Firebase/backend service implementation |
| 6 | Core Prototype | ✅ Full | Main gameplay loop, player, obstacles, collectibles |
| 7 | Asset Generation | ✅ Full | DALL-E sprites, texture atlases, audio placeholders |
| 8 | Vertical Slice | ✅ Full | Polished UI, screens, overlays, audio service |
| 9 | Content Production | ✅ Full | 10 level configs, ad-gating, level select |
| 10 | Testing | ✅ Full | Unit tests, integration tests, QA checklist |
| 11 | Release Prep | ✅ Full | ProGuard, signing, store metadata, privacy policy |
| 12 | Post-Launch | ✅ Full | Analytics aggregation, scoring, learning weights |

## Required Environment Variables

```bash
# AI Services - Claude AI is PRIMARY
ANTHROPIC_API_KEY=sk-ant-... # Primary AI provider (required)
CLAUDE_MODEL=claude-3-5-sonnet-20241022  # Optional: claude-3-opus, claude-3-haiku

# OpenAI - Optional fallback and DALL-E image generation
OPENAI_API_KEY=sk-...        # For DALL-E asset generation and fallback

# GitHub (required for repo creation)
GITHUB_TOKEN=ghp_...         # Personal Access Token with repo scope
GITHUB_ORG=your-org          # Organization or username

# Database & Redis
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
```

## Future Enhancements

- [x] ~~Full Flutter code generation for Steps 1-3~~ ✅ Implemented
- [x] ~~Real GitHub integration~~ ✅ Implemented  
- [x] ~~AI asset generation pipeline~~ ✅ Implemented
- [x] ~~Steps 4-6: Analytics design, implementation, core prototype~~ ✅ Implemented
- [x] ~~Steps 8-12: Vertical slice through post-launch~~ ✅ Implemented
- [ ] iOS support (currently Android-only)
- [ ] Cloud sync for unlock state
- [ ] A/B testing framework
- [ ] Real audio generation (ElevenLabs/similar)
- [ ] Multi-language game support
- [ ] Advanced difficulty balancing with ML
- [ ] Automated Play Store publishing
