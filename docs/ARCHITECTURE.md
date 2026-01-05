# GameFactory Architecture

## System Overview

GameFactory is a **state machine-driven** game generation platform. Every game creation follows a strict 12-step workflow where each step must fully complete and validate before proceeding.

## Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  GAMEFACTORY PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│    FRONTEND (Next.js)                 BACKEND (FastAPI)                             │
│    ┌─────────────────┐               ┌─────────────────────────────────────────┐   │
│    │                 │               │                                         │   │
│    │  Dashboard      │   REST API    │  ┌─────────────────────────────────┐   │   │
│    │  - Batches      │◄─────────────►│  │        API Layer                │   │   │
│    │  - Games        │               │  │  POST /batches                  │   │   │
│    │  - Metrics      │               │  │  GET  /games                    │   │   │
│    │  - Analytics    │               │  │  POST /events                   │   │   │
│    │                 │               │  │  GET  /metrics                  │   │   │
│    └─────────────────┘               │  └──────────────┬──────────────────┘   │   │
│                                      │                 │                       │   │
│                                      │                 ▼                       │   │
│                                      │  ┌─────────────────────────────────┐   │   │
│                                      │  │      Service Layer              │   │   │
│                                      │  │  - BatchService                 │   │   │
│                                      │  │  - GameService                  │   │   │
│                                      │  │  - WorkflowService              │   │   │
│                                      │  │  - AnalyticsService             │   │   │
│                                      │  └──────────────┬──────────────────┘   │   │
│                                      │                 │                       │   │
│                                      │                 ▼                       │   │
│                                      │  ┌─────────────────────────────────┐   │   │
│                                      │  │    State Machine Engine         │   │   │
│                                      │  │  - Step validation              │   │   │
│                                      │  │  - Transition rules             │   │   │
│                                      │  │  - Retry logic                  │   │   │
│                                      │  │  - Artifact persistence         │   │   │
│                                      │  └──────────────┬──────────────────┘   │   │
│                                      └─────────────────┼───────────────────────┘   │
│                                                        │                           │
│    ┌───────────────────────────────────────────────────┼───────────────────────┐   │
│    │                         WORKER LAYER (Celery)     │                       │   │
│    │                                                   ▼                       │   │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐   │   │
│    │  │   Redis     │  │  Worker 1   │  │         Step Executors          │   │   │
│    │  │   Queue     │◄►│  Worker 2   │◄►│  - PreProductionStep            │   │   │
│    │  │             │  │  Worker N   │  │  - ProjectSetupStep             │   │   │
│    │  └─────────────┘  └─────────────┘  │  - ArchitectureStep             │   │   │
│    │                                    │  - AnalyticsDesignStep          │   │   │
│    │                                    │  - AnalyticsImplStep            │   │   │
│    │                                    │  - CorePrototypeStep            │   │   │
│    │                                    │  - AssetGenerationStep          │   │   │
│    │                                    │  - VerticalSliceStep            │   │   │
│    │                                    │  - ContentProductionStep        │   │   │
│    │                                    │  - TestingStep                  │   │   │
│    │                                    │  - ReleaseStep                  │   │   │
│    │                                    │  - PostLaunchStep               │   │   │
│    │                                    └─────────────────────────────────┘   │   │
│    └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│    ┌─────────────────────────────────────────────────────────────────────────────┐   │
│    │                            DATA LAYER                                       │   │
│    │                                                                             │   │
│    │  ┌─────────────────────────────────────────────────────────────────────┐   │   │
│    │  │                        PostgreSQL                                   │   │   │
│    │  │                                                                     │   │   │
│    │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │   │
│    │  │  │ batches  │  │  games   │  │  steps   │  │ analytics_events │   │   │   │
│    │  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │   │   │
│    │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │   │
│    │  │  │mechanics │  │ assets   │  │ builds   │  │     metrics      │   │   │   │
│    │  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │   │   │
│    │  └─────────────────────────────────────────────────────────────────────┘   │   │
│    └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                              EXTERNAL INTEGRATIONS                                   │
│                                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │   GitHub   │  │  Firebase  │  │   Google   │  │  OpenAI /  │  │   Asset    │    │
│  │    API     │  │ Analytics  │  │    Ads     │  │  Claude    │  │    Gen     │    │
│  │            │  │            │  │            │  │            │  │            │    │
│  │ - Repos    │  │ - Events   │  │ - Rewarded │  │ - GDD Gen  │  │ - Sprites  │    │
│  │ - Actions  │  │ - User     │  │ - Banner   │  │ - Code     │  │ - Audio    │    │
│  │ - Releases │  │   Props    │  │            │  │ - Levels   │  │ - UI       │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
              ┌─────────────────────────────────────────────────────────────┐
              │                  GENERATED GAME REPOSITORIES                 │
              │                                                              │
              │  Each game is a SEPARATE GitHub repository:                  │
              │                                                              │
              │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
              │  │ gamefactory- │  │ gamefactory- │  │ gamefactory- │       │
              │  │ game-001     │  │ game-002     │  │ game-010     │       │
              │  │              │  │              │  │              │       │
              │  │ Flutter+Flame│  │ Flutter+Flame│  │ Flutter+Flame│       │
              │  │ Analytics    │  │ Analytics    │  │ Analytics    │       │
              │  │ Ads          │  │ Ads          │  │ Ads          │       │
              │  │ CI/CD        │  │ CI/CD        │  │ CI/CD        │       │
              │  └──────────────┘  └──────────────┘  └──────────────┘       │
              └─────────────────────────────────────────────────────────────┘
```

## State Machine Design

### Game Creation States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GAME STATE MACHINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    [CREATED] ──► [STEP_1_PENDING] ──► [STEP_1_RUNNING] ──┬─► [STEP_1_COMPLETED]
│                                                          │              │
│                                                          └─► [STEP_1_FAILED]
│                                                                   │
│                                                          retry ◄──┘
│                                                                         │
│    [STEP_1_COMPLETED] ──► [STEP_2_PENDING] ──► ...                     │
│                                                                         │
│    ...                                                                  │
│                                                                         │
│    [STEP_12_COMPLETED] ──► [PUBLISHED]                                 │
│                                                                         │
│    Any step can transition to: [CANCELLED] or [FAILED]                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     STEP EXECUTION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────────┐                                              │
│    │  PENDING    │ ─── trigger ───► ┌─────────────┐            │
│    └─────────────┘                   │   RUNNING   │            │
│                                      └──────┬──────┘            │
│                                             │                   │
│                           ┌─────────────────┼─────────────────┐ │
│                           ▼                 ▼                 ▼ │
│                    ┌──────────┐      ┌──────────┐     ┌────────┐│
│                    │COMPLETED │      │  FAILED  │     │TIMEOUT ││
│                    └────┬─────┘      └────┬─────┘     └───┬────┘│
│                         │                 │               │     │
│                         │                 └───────┬───────┘     │
│                         │                         │             │
│                         │              retry_count < MAX?       │
│                         │                   │     │             │
│                         │              yes ─┘     └─ no         │
│                         │               │              │        │
│                         │               ▼              ▼        │
│                         │         [RETRY]      [PERMANENTLY     │
│                         │            │           FAILED]        │
│                         │            │              │           │
│                         │            └──► PENDING   │           │
│                         │                           │           │
│                         ▼                           ▼           │
│                  [NEXT STEP]              [MANUAL REVIEW]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### Backend Services

| Service | Responsibility |
|---------|---------------|
| `BatchService` | Create and manage game batches |
| `GameService` | Individual game CRUD and status |
| `WorkflowService` | State machine transitions |
| `StepExecutor` | Execute individual workflow steps |
| `GitHubService` | Repository creation and management |
| `AnalyticsService` | Event aggregation and metrics |
| `AssetService` | AI asset generation pipeline |
| `MechanicsService` | Flame mechanics library management |

### Celery Tasks

| Task | Description |
|------|-------------|
| `execute_step` | Run a specific workflow step |
| `process_batch` | Orchestrate batch game creation |
| `generate_assets` | AI asset generation |
| `build_game` | Trigger GitHub Actions build |
| `aggregate_metrics` | Daily analytics aggregation |

### Database Models

See `docs/DATABASE_SCHEMA.md` for complete schema documentation.

## Security Considerations

1. **API Authentication**: JWT tokens for frontend, API keys for game events
2. **GitHub**: Fine-grained PAT with minimal permissions
3. **Secrets**: Environment variables, never committed
4. **Events**: Rate limiting and validation

## Scalability

- **Horizontal**: Add more Celery workers
- **Vertical**: PostgreSQL read replicas for metrics
- **Caching**: Redis for frequently accessed data
- **Queues**: Separate queues for different task priorities
