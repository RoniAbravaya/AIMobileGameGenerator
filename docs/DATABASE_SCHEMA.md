# GameFactory Database Schema

## Entity Relationship Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│    ┌──────────────────┐         ┌──────────────────┐                               │
│    │     batches      │         │      games       │                               │
│    ├──────────────────┤         ├──────────────────┤                               │
│    │ id (PK)          │────────►│ id (PK)          │                               │
│    │ name             │         │ batch_id (FK)    │                               │
│    │ status           │         │ name             │                               │
│    │ game_count       │         │ genre            │                               │
│    │ genre_mix        │         │ status           │                               │
│    │ constraints      │         │ current_step     │                               │
│    │ created_at       │         │ github_repo      │                               │
│    │ completed_at     │         │ gdd_spec         │                               │
│    └──────────────────┘         │ created_at       │                               │
│                                 │ updated_at       │                               │
│                                 └────────┬─────────┘                               │
│                                          │                                          │
│              ┌───────────────────────────┼───────────────────────────┐              │
│              │                           │                           │              │
│              ▼                           ▼                           ▼              │
│    ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐      │
│    │   game_steps     │       │   game_assets    │       │   game_builds    │      │
│    ├──────────────────┤       ├──────────────────┤       ├──────────────────┤      │
│    │ id (PK)          │       │ id (PK)          │       │ id (PK)          │      │
│    │ game_id (FK)     │       │ game_id (FK)     │       │ game_id (FK)     │      │
│    │ step_number      │       │ asset_type       │       │ build_number     │      │
│    │ step_name        │       │ filename         │       │ status           │      │
│    │ status           │       │ storage_url      │       │ platform         │      │
│    │ started_at       │       │ ai_prompt        │       │ artifact_url     │      │
│    │ completed_at     │       │ metadata         │       │ logs_url         │      │
│    │ retry_count      │       │ created_at       │       │ github_run_id    │      │
│    │ error_message    │       └──────────────────┘       │ created_at       │      │
│    │ artifacts        │                                  └──────────────────┘      │
│    │ logs             │                                                            │
│    └──────────────────┘                                                            │
│                                                                                      │
│    ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐      │
│    │    mechanics     │       │ analytics_events │       │  game_metrics    │      │
│    ├──────────────────┤       ├──────────────────┤       ├──────────────────┤      │
│    │ id (PK)          │       │ id (PK)          │       │ id (PK)          │      │
│    │ name             │       │ game_id (FK)     │       │ game_id (FK)     │      │
│    │ source_url       │       │ event_type       │       │ date             │      │
│    │ genre_tags       │       │ user_id          │       │ installs         │      │
│    │ input_model      │       │ session_id       │       │ dau              │      │
│    │ complexity       │       │ level            │       │ retention_d1     │      │
│    │ description      │       │ properties       │       │ retention_d7     │      │
│    │ flame_example    │       │ timestamp        │       │ ad_impressions   │      │
│    │ is_active        │       │ received_at      │       │ ad_revenue       │      │
│    └──────────────────┘       └──────────────────┘       │ score            │      │
│                                                          └──────────────────┘      │
│                                                                                      │
│    ┌──────────────────┐       ┌──────────────────┐                                 │
│    │ learning_weights │       │ generation_logs  │                                 │
│    ├──────────────────┤       ├──────────────────┤                                 │
│    │ id (PK)          │       │ id (PK)          │                                 │
│    │ mechanic_id (FK) │       │ batch_id (FK)    │                                 │
│    │ genre            │       │ game_id (FK)     │                                 │
│    │ weight           │       │ step_number      │                                 │
│    │ sample_count     │       │ log_type         │                                 │
│    │ last_updated     │       │ message          │                                 │
│    └──────────────────┘       │ metadata         │                                 │
│                               │ created_at       │                                 │
│                               └──────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Table Definitions

### batches

Represents a batch of games to be generated together.

```sql
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    game_count INTEGER NOT NULL DEFAULT 10,
    genre_mix JSONB NOT NULL DEFAULT '[]',
    constraints JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    ))
);
```

### games

Individual game records with full lifecycle tracking.

```sql
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    genre VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    current_step INTEGER NOT NULL DEFAULT 0,
    github_repo VARCHAR(255),
    github_repo_url VARCHAR(500),
    gdd_spec JSONB DEFAULT '{}',
    analytics_spec JSONB DEFAULT '{}',
    selected_mechanics JSONB DEFAULT '[]',
    selected_template VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_status CHECK (status IN (
        'created', 'in_progress', 'completed', 'failed', 'cancelled', 'published'
    )),
    CONSTRAINT valid_step CHECK (current_step >= 0 AND current_step <= 12)
);

CREATE INDEX idx_games_batch_id ON games(batch_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_genre ON games(genre);
```

### game_steps

Detailed tracking of each workflow step execution.

```sql
CREATE TABLE game_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    artifacts JSONB DEFAULT '{}',
    validation_results JSONB DEFAULT '{}',
    logs TEXT,
    
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'skipped'
    )),
    CONSTRAINT unique_game_step UNIQUE (game_id, step_number)
);

CREATE INDEX idx_game_steps_game_id ON game_steps(game_id);
CREATE INDEX idx_game_steps_status ON game_steps(status);
```

### mechanics

Library of game mechanics from Flame examples.

```sql
CREATE TABLE mechanics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    source_url VARCHAR(500) NOT NULL,
    flame_example VARCHAR(255),
    genre_tags JSONB NOT NULL DEFAULT '[]',
    input_model VARCHAR(100) NOT NULL,
    complexity INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    code_snippet TEXT,
    compatible_with_ads BOOLEAN DEFAULT true,
    compatible_with_levels BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_complexity CHECK (complexity >= 1 AND complexity <= 5),
    CONSTRAINT valid_input_model CHECK (input_model IN (
        'tap', 'drag', 'joystick', 'tilt', 'swipe', 'multi_touch'
    ))
);

CREATE INDEX idx_mechanics_genre_tags ON mechanics USING GIN(genre_tags);
CREATE INDEX idx_mechanics_active ON mechanics(is_active) WHERE is_active = true;
```

### game_assets

AI-generated assets for each game.

```sql
CREATE TABLE game_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    asset_type VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    storage_url VARCHAR(500),
    local_path VARCHAR(500),
    ai_prompt TEXT,
    ai_model VARCHAR(100),
    width INTEGER,
    height INTEGER,
    format VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_asset_type CHECK (asset_type IN (
        'sprite', 'background', 'ui_element', 'particle', 
        'sound_effect', 'music', 'icon', 'splash'
    ))
);

CREATE INDEX idx_game_assets_game_id ON game_assets(game_id);
CREATE INDEX idx_game_assets_type ON game_assets(asset_type);
```

### game_builds

Build tracking for GitHub Actions.

```sql
CREATE TABLE game_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    build_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    platform VARCHAR(50) NOT NULL DEFAULT 'android',
    build_type VARCHAR(50) NOT NULL DEFAULT 'debug',
    artifact_url VARCHAR(500),
    logs_url VARCHAR(500),
    github_run_id BIGINT,
    github_workflow VARCHAR(255),
    version_name VARCHAR(50),
    version_code INTEGER,
    file_size_bytes BIGINT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'running', 'success', 'failure', 'cancelled'
    )),
    CONSTRAINT valid_platform CHECK (platform IN ('android', 'ios', 'web')),
    CONSTRAINT valid_build_type CHECK (build_type IN ('debug', 'profile', 'release'))
);

CREATE INDEX idx_game_builds_game_id ON game_builds(game_id);
CREATE INDEX idx_game_builds_status ON game_builds(status);
```

### analytics_events

Raw analytics events from games.

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    level INTEGER,
    properties JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'game_start', 'level_start', 'level_complete', 'level_fail',
        'unlock_prompt_shown', 'rewarded_ad_started', 'rewarded_ad_completed',
        'rewarded_ad_failed', 'level_unlocked', 'iap_initiated', 'iap_completed'
    ))
);

-- Partition by month for scalability
CREATE INDEX idx_analytics_events_game_id ON analytics_events(game_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
```

### game_metrics

Aggregated daily metrics per game.

```sql
CREATE TABLE game_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    installs INTEGER DEFAULT 0,
    dau INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    avg_session_duration_seconds INTEGER DEFAULT 0,
    retention_d1 DECIMAL(5,4) DEFAULT 0,
    retention_d7 DECIMAL(5,4) DEFAULT 0,
    retention_d30 DECIMAL(5,4) DEFAULT 0,
    levels_completed INTEGER DEFAULT 0,
    levels_failed INTEGER DEFAULT 0,
    ad_impressions INTEGER DEFAULT 0,
    ad_revenue_cents INTEGER DEFAULT 0,
    iap_revenue_cents INTEGER DEFAULT 0,
    score DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_game_date UNIQUE (game_id, date)
);

CREATE INDEX idx_game_metrics_game_id ON game_metrics(game_id);
CREATE INDEX idx_game_metrics_date ON game_metrics(date);
CREATE INDEX idx_game_metrics_score ON game_metrics(score DESC);
```

### learning_weights

Weights for mechanic selection based on past performance.

```sql
CREATE TABLE learning_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    genre VARCHAR(100) NOT NULL,
    weight DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    sample_count INTEGER NOT NULL DEFAULT 0,
    avg_retention_d7 DECIMAL(5,4) DEFAULT 0,
    avg_completion_rate DECIMAL(5,4) DEFAULT 0,
    avg_ad_opt_in_rate DECIMAL(5,4) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_mechanic_genre UNIQUE (mechanic_id, genre),
    CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 10)
);

CREATE INDEX idx_learning_weights_mechanic ON learning_weights(mechanic_id);
CREATE INDEX idx_learning_weights_genre ON learning_weights(genre);
```

### generation_logs

Detailed logs for debugging and auditing.

```sql
CREATE TABLE generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    step_number INTEGER,
    log_level VARCHAR(20) NOT NULL DEFAULT 'info',
    log_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_log_level CHECK (log_level IN (
        'debug', 'info', 'warning', 'error', 'critical'
    ))
);

CREATE INDEX idx_generation_logs_batch ON generation_logs(batch_id);
CREATE INDEX idx_generation_logs_game ON generation_logs(game_id);
CREATE INDEX idx_generation_logs_created ON generation_logs(created_at);
```

## Indexes for Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_games_batch_status ON games(batch_id, status);
CREATE INDEX idx_game_steps_status_step ON game_steps(status, step_number);
CREATE INDEX idx_analytics_game_type_time ON analytics_events(game_id, event_type, timestamp);
CREATE INDEX idx_metrics_game_date_score ON game_metrics(game_id, date DESC, score DESC);

-- Partial indexes
CREATE INDEX idx_games_active ON games(status) WHERE status NOT IN ('cancelled', 'failed');
CREATE INDEX idx_steps_pending ON game_steps(game_id, step_number) WHERE status = 'pending';
```

## Migration Notes

1. Use Alembic for all schema migrations
2. Always include rollback scripts
3. Test migrations on staging before production
4. Backup database before major migrations
