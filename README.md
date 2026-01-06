# GameFactory

**Automated Flutter + Flame Mobile Game Generation Engine**

A web-based game creation engine that automatically generates Flutter + Flame mobile games using a strict, professional, step-by-step development workflow. Each generated game is created in its own dedicated GitHub repository, built automatically, instrumented with analytics, and evaluated so future generations improve based on real performance data.

## 🎯 Mission

Generate, deploy, and iterate on mobile games at scale using AI as a **controlled tool** within a deterministic pipeline—not a free-form generator.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GameFactory Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   Next.js    │    │   FastAPI    │    │      Celery Workers          │  │
│  │   Frontend   │◄──►│   Backend    │◄──►│  (Game Generation Pipeline)  │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┬───────────────┘  │
│                             │                           │                   │
│                             ▼                           ▼                   │
│                    ┌──────────────┐            ┌──────────────┐            │
│                    │  PostgreSQL  │            │    Redis     │            │
│                    │   Database   │            │    Queue     │            │
│                    └──────────────┘            └──────────────┘            │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                        External Services                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  GitHub  │ │ Firebase │ │  Google  │ │   AI     │ │  Asset   │        │
│  │   API    │ │Analytics │ │   Ads    │ │ Services │ │   Gen    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────┐
          │              Generated Game Repositories             │
          │  game-001-runner, game-002-puzzle, ... game-010-xyz  │
          │  Each with: Flutter + Flame code, CI/CD, Analytics   │
          └─────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
/workspace
├── backend/              # FastAPI backend service
│   ├── app/
│   │   ├── api/         # REST endpoints
│   │   ├── core/        # Config, security, state machine
│   │   ├── db/          # Database connection
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   ├── workers/     # Celery tasks
│   │   └── utils/       # Utilities
│   ├── tests/           # Backend tests
│   └── alembic/         # DB migrations
├── frontend/            # Next.js dashboard
│   └── src/
│       ├── app/         # Next.js app router
│       ├── components/  # React components
│       ├── lib/         # Utilities
│       └── types/       # TypeScript types
├── game_templates/      # Flame game templates
├── mechanics_library/   # Indexed Flame mechanics
├── asset_generation/    # AI asset pipelines
├── docs/                # Documentation
├── docker-compose.yml   # Local development
└── README.md
```

## 🔄 12-Step Game Creation Workflow

**CRITICAL**: This workflow is implemented as a **STATE MACHINE**. Steps are idempotent, retry-safe, and fully validated before progression.

| Step | Name | Description | Validation |
|------|------|-------------|------------|
| 1 | Pre-production | Generate GDD-lite (genre, mechanics, analytics plan) | JSON schema |
| 2 | Project Setup | Clone Flame template, configure flavors | flutter analyze |
| 3 | Architecture | Enforce standard layers, domain tests | compile + tests |
| 4 | Analytics Design | Generate event spec | schema consistency |
| 5 | Analytics Impl | Implement analytics wrapper | debug verification |
| 6 | Core Prototype | Main mechanic loop, placeholder assets | playable loop |
| 7 | Asset Generation | AI-generated art + audio | assets load |
| 8 | Vertical Slice | One polished level | FPS stable |
| 9 | Content Production | 10 levels, ad gating | level tests |
| 10 | Testing | Unit + integration + QA | all tests pass |
| 11 | Release Prep | Optimization, signing | release checklist |
| 12 | Post-Launch | Analytics aggregation, learning loop | constraints generated |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Flutter SDK 3.x
- GitHub CLI (`gh`)

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd workspace

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec backend alembic upgrade head

# Access services
# - Backend API: http://localhost:8000
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:8000/docs
```

### Create Your First Batch

```bash
# Via API
curl -X POST http://localhost:8000/api/v1/batches \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "genre_mix": ["platformer", "runner", "puzzle"]}'

# Via Frontend
# Navigate to http://localhost:3000 and click "New Batch"
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/batches` | Create a new batch of games |
| GET | `/api/v1/batches/{id}` | Get batch status |
| GET | `/api/v1/games` | List all games |
| GET | `/api/v1/games/{id}` | Get game details |
| POST | `/api/v1/events` | Receive analytics events |
| GET | `/api/v1/metrics` | Get aggregated metrics |

## 🎮 Game Monetization

- **Levels 1-3**: Free to play
- **Levels 4-10**: Unlock by watching a rewarded ad after completing the previous level
- **Local Persistence**: Unlock state saved locally (optional cloud sync)

## 📈 Analytics Events

All games emit these standardized events:

```
game_start, level_start, level_complete, level_fail,
unlock_prompt_shown, rewarded_ad_started, rewarded_ad_completed,
rewarded_ad_failed, level_unlocked
```

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.11) |
| Workers | Celery + Redis |
| Database | PostgreSQL 15 |
| Frontend | Next.js 14 (TypeScript) |
| Games | Flutter + Flame |
| Ads | Google Mobile Ads |
| Analytics | Firebase Analytics |
| CI/CD | GitHub Actions |
| Deployment | Railway / Docker |

## ☁️ Cloud Deployment

GameFactory supports automated deployment to Railway via GitHub Actions.

### Quick Deploy to Railway

1. **Fork this repository** to your GitHub account

2. **Create a Railway project** at [railway.app](https://railway.app)
   - Add PostgreSQL and Redis plugins
   - Create services for backend, celery-worker, celery-beat, and frontend

3. **Set up GitHub Secrets**:
   ```
   RAILWAY_TOKEN=<your-railway-api-token>
   ```

4. **Configure Railway Environment Variables**:
   ```
   ANTHROPIC_API_KEY=sk-ant-...     # Required: Claude AI
   OPENAI_API_KEY=sk-...            # Recommended: DALL-E assets
   GITHUB_TOKEN=ghp_...             # Required: Game repo creation
   GITHUB_ORG=your-org              # Required: Your GitHub org/username
   ```

5. **Push to main** - GitHub Actions will:
   - Run tests
   - Build Docker images
   - Push to GitHub Container Registry
   - Deploy to Railway

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

### Docker Images

Production images are available at:
```
ghcr.io/<owner>/<repo>/backend:latest
ghcr.io/<owner>/<repo>/frontend:latest
```

## 📝 License

MIT License - see LICENSE file for details.
