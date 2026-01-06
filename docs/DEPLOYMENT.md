# GameFactory Deployment Guide

This guide covers deploying GameFactory to Railway using GitHub Actions for CI/CD.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GitHub Actions Pipeline                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Push to main] → [Test] → [Build] → [Push to GHCR] → [Deploy to Railway]  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Railway Platform                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Frontend   │  │   Backend    │  │Celery Worker │  │ Celery Beat  │    │
│  │  (Next.js)   │  │  (FastAPI)   │  │              │  │  (Scheduler) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│          │                │                 │                 │             │
│          └────────────────┼─────────────────┴─────────────────┘             │
│                           ▼                                                  │
│                  ┌──────────────────────────────┐                           │
│                  │ PostgreSQL │     Redis       │                           │
│                  │  (Plugin)  │    (Plugin)     │                           │
│                  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- GitHub repository with GameFactory code
- Railway account (https://railway.app)
- API keys for AI services (Anthropic, OpenAI)
- GitHub Personal Access Token (for game repo creation)

## Step 1: Set Up Railway Project

### 1.1 Create New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"** → **"Empty Project"**
3. Name your project (e.g., `gamefactory-production`)

### 1.2 Add Database Plugins

Add the following plugins from Railway:

1. **PostgreSQL**
   - Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
   - Railway will automatically provide `DATABASE_URL`

2. **Redis**
   - Click **"+ New"** → **"Database"** → **"Add Redis"**
   - Railway will automatically provide `REDIS_URL`

### 1.3 Create Services

Create four services from your GitHub repo:

#### Backend Service
1. Click **"+ New"** → **"GitHub Repo"**
2. Select your GameFactory repository
3. Configure:
   - **Name**: `backend`
   - **Root Directory**: `/backend`
   - **Dockerfile Path**: `Dockerfile.prod`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4`

#### Celery Worker Service
1. Click **"+ New"** → **"GitHub Repo"**
2. Select your GameFactory repository
3. Configure:
   - **Name**: `celery-worker`
   - **Root Directory**: `/backend`
   - **Dockerfile Path**: `Dockerfile.prod`
   - **Start Command**: `celery -A app.workers.celery_app worker --loglevel=info --concurrency=4 -Q batch,steps,assets,analytics`

#### Celery Beat Service
1. Click **"+ New"** → **"GitHub Repo"**
2. Select your GameFactory repository
3. Configure:
   - **Name**: `celery-beat`
   - **Root Directory**: `/backend`
   - **Dockerfile Path**: `Dockerfile.prod`
   - **Start Command**: `celery -A app.workers.celery_app beat --loglevel=info`

#### Frontend Service
1. Click **"+ New"** → **"GitHub Repo"**
2. Select your GameFactory repository
3. Configure:
   - **Name**: `frontend`
   - **Root Directory**: `/frontend`
   - **Dockerfile Path**: `Dockerfile.prod`

## Step 2: Configure Environment Variables

### 2.1 Shared Variables (All Services)

In Railway, go to **Settings** → **Shared Variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `ENVIRONMENT` | `production` | Environment mode |
| `DEBUG` | `false` | Disable debug mode |
| `SECRET_KEY` | `<generate-strong-key>` | App secret key |

### 2.2 Backend/Worker Variables

Add these to backend, celery-worker, and celery-beat services:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | ✅ Yes (Reference) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | ✅ Yes (Reference) |
| `CELERY_BROKER_URL` | `${{Redis.REDIS_URL}}` | ✅ Yes (Reference) |
| `CELERY_RESULT_BACKEND` | `${{Redis.REDIS_URL}}` | ✅ Yes (Reference) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | ✅ Yes |
| `OPENAI_API_KEY` | `sk-...` | ⚠️ Recommended |
| `GITHUB_TOKEN` | `ghp_...` | ✅ Yes |
| `GITHUB_ORG` | `your-org-name` | ✅ Yes |
| `CLAUDE_MODEL` | `claude-3-5-sonnet-20241022` | Optional |

### 2.3 Frontend Variables

Add to the frontend service:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://<backend-service>.railway.app` |

## Step 3: Set Up GitHub Actions

### 3.1 Get Railway Token

1. Go to Railway Dashboard → **Account Settings** → **Tokens**
2. Click **"Create Token"**
3. Name it (e.g., `github-actions`)
4. Copy the token

### 3.2 Add GitHub Secrets

In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**:

| Secret Name | Value |
|-------------|-------|
| `RAILWAY_TOKEN` | Your Railway API token |

### 3.3 Add GitHub Variables (Optional)

Go to **Settings** → **Secrets and variables** → **Actions** → **Variables**:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.railway.app` |

## Step 4: Run Database Migrations

After the first deployment, run migrations:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migrations on the backend service
railway run -s backend -- alembic upgrade head

# Seed the mechanics library
railway run -s backend -- python -m app.db.seed
```

## Step 5: Verify Deployment

### Check Service Health

1. **Backend API**: `https://<backend>.railway.app/health`
2. **API Docs**: `https://<backend>.railway.app/docs`
3. **Frontend**: `https://<frontend>.railway.app`

### Monitor Services

- Railway Dashboard shows logs for each service
- Use the **Deployments** tab to see build history
- Check **Metrics** for resource usage

## CI/CD Pipeline Details

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) performs:

### On Every Push/PR:
1. **Backend Tests**
   - Sets up PostgreSQL and Redis services
   - Installs Python dependencies
   - Runs linting (black, isort, flake8)
   - Runs pytest

2. **Frontend Tests**
   - Installs Node.js dependencies
   - Runs TypeScript type checking
   - Runs ESLint
   - Builds the application

### On Push to `main`:
3. **Build Docker Images**
   - Builds production images using multi-stage Dockerfiles
   - Pushes to GitHub Container Registry (ghcr.io)
   - Tags: `latest`, `<branch>`, `<commit-sha>`

4. **Deploy to Railway**
   - Uses Railway CLI
   - Deploys all services

## Docker Images

Images are pushed to GitHub Container Registry:

```
ghcr.io/<owner>/<repo>/backend:latest
ghcr.io/<owner>/<repo>/frontend:latest
```

## Rollback Procedure

### Via Railway Dashboard:
1. Go to the service → **Deployments**
2. Find the previous working deployment
3. Click **"Rollback"**

### Via CLI:
```bash
railway rollback -s backend
railway rollback -s frontend
```

## Cost Estimation

Railway pricing (as of 2024):

| Resource | Usage | Estimated Cost |
|----------|-------|----------------|
| Backend | 512MB RAM, 0.5 vCPU | ~$5/month |
| Celery Worker | 1GB RAM, 1 vCPU | ~$10/month |
| Celery Beat | 256MB RAM, 0.25 vCPU | ~$3/month |
| Frontend | 512MB RAM, 0.5 vCPU | ~$5/month |
| PostgreSQL | 1GB | ~$5/month |
| Redis | 256MB | ~$3/month |
| **Total** | | **~$31/month** |

*Note: Prices vary based on actual usage. Railway offers a free tier with $5 credit.*

## Troubleshooting

### Build Failures

```bash
# Check build logs in Railway dashboard
# Or via CLI:
railway logs -s backend
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set correctly
railway variables -s backend

# Test connection
railway run -s backend -- python -c "from app.db.session import engine; print('Connected!')"
```

### Celery Tasks Not Running

```bash
# Check worker logs
railway logs -s celery-worker

# Verify Redis connection
railway run -s celery-worker -- python -c "import redis; r = redis.from_url('$REDIS_URL'); print(r.ping())"
```

### Frontend Can't Connect to Backend

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check CORS settings in backend
3. Ensure backend is publicly accessible

## Security Checklist

- [ ] All secrets stored in Railway/GitHub Secrets (never in code)
- [ ] `SECRET_KEY` is randomly generated and unique
- [ ] `DEBUG=false` in production
- [ ] CORS origins properly configured
- [ ] GitHub token has minimal required permissions
- [ ] Database credentials are auto-generated by Railway

## Updating the Deployment

Simply push to `main` branch:

```bash
git push origin main
```

The CI/CD pipeline will automatically:
1. Run tests
2. Build new Docker images
3. Push to GHCR
4. Deploy to Railway
