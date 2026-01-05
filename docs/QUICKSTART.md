# GameFactory Quickstart Guide

## Prerequisites

- Docker & Docker Compose
- Git

## Quick Start (5 minutes)

### 1. Start Services

```bash
cd /workspace

# Start all services
docker-compose up -d

# Wait for services to be healthy (30 seconds)
docker-compose ps
```

### 2. Initialize Database

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Seed mechanics library
docker-compose exec backend python -m app.db.seed
```

### 3. Access Services

- **API Documentation**: http://localhost:8000/docs
- **Frontend Dashboard**: http://localhost:3000
- **Celery Monitor (Flower)**: http://localhost:5555

### 4. Create Your First Batch

Using the API:

```bash
curl -X POST http://localhost:8000/api/v1/batches \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Batch",
    "game_count": 10,
    "genre_mix": ["platformer", "runner", "puzzle"]
  }'
```

Or via the frontend at http://localhost:3000

### 5. Start Batch Processing

```bash
curl -X POST http://localhost:8000/api/v1/batches/{batch_id}/start
```

### 6. Monitor Progress

- View batch status: `GET /api/v1/batches/{id}`
- View game steps: `GET /api/v1/games/{id}/steps`
- Celery tasks: http://localhost:5555

## Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run frontend
npm run dev
```

### Running Workers Separately

```bash
cd backend

# Worker
celery -A app.workers.celery_app worker --loglevel=info

# Beat (scheduler)
celery -A app.workers.celery_app beat --loglevel=info
```

## Configuration

Key environment variables (see `backend/.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `GITHUB_TOKEN` | GitHub PAT for repo creation |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

## Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f celery-worker

# Rebuild after code changes
docker-compose build backend
docker-compose up -d backend

# Reset database
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs
```

### Database connection errors
```bash
# Ensure PostgreSQL is ready
docker-compose exec postgres pg_isready -U gamefactory
```

### Celery tasks not running
```bash
# Check Redis is up
docker-compose exec redis redis-cli ping

# Check worker logs
docker-compose logs celery-worker
```

## Next Steps

1. Configure GitHub token for real repo creation
2. Add OpenAI API key for AI features
3. Review the 12-step workflow in `docs/ARCHITECTURE.md`
4. Explore the mechanics library at `GET /api/v1/mechanics`
