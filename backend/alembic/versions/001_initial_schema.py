"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2025-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Batches table
    op.create_table(
        'batches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('game_count', sa.Integer, nullable=False, default=10),
        sa.Column('genre_mix', postgresql.JSON, nullable=False, default=[]),
        sa.Column('constraints', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_batches_status', 'batches', ['status'])

    # Games table
    op.create_table(
        'games',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('batches.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=False, unique=True),
        sa.Column('genre', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, default='created'),
        sa.Column('current_step', sa.Integer, nullable=False, default=0),
        sa.Column('github_repo', sa.String(255), nullable=True),
        sa.Column('github_repo_url', sa.String(500), nullable=True),
        sa.Column('gdd_spec', postgresql.JSON, nullable=True),
        sa.Column('analytics_spec', postgresql.JSON, nullable=True),
        sa.Column('selected_mechanics', postgresql.JSON, nullable=True),
        sa.Column('selected_template', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_games_batch_id', 'games', ['batch_id'])
    op.create_index('idx_games_status', 'games', ['status'])
    op.create_index('idx_games_genre', 'games', ['genre'])

    # Game steps table
    op.create_table(
        'game_steps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_number', sa.Integer, nullable=False),
        sa.Column('step_name', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('retry_count', sa.Integer, nullable=False, default=0),
        sa.Column('max_retries', sa.Integer, nullable=False, default=3),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('artifacts', postgresql.JSON, nullable=True),
        sa.Column('validation_results', postgresql.JSON, nullable=True),
        sa.Column('logs', sa.Text, nullable=True),
        sa.UniqueConstraint('game_id', 'step_number', name='unique_game_step'),
    )
    op.create_index('idx_game_steps_game_id', 'game_steps', ['game_id'])
    op.create_index('idx_game_steps_status', 'game_steps', ['status'])

    # Mechanics table
    op.create_table(
        'mechanics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
        sa.Column('source_url', sa.String(500), nullable=False),
        sa.Column('flame_example', sa.String(255), nullable=True),
        sa.Column('genre_tags', postgresql.JSON, nullable=False, default=[]),
        sa.Column('input_model', sa.String(100), nullable=False),
        sa.Column('complexity', sa.Integer, nullable=False, default=1),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('code_snippet', sa.Text, nullable=True),
        sa.Column('compatible_with_ads', sa.Boolean, default=True),
        sa.Column('compatible_with_levels', sa.Boolean, default=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_mechanics_active', 'mechanics', ['is_active'])

    # Game assets table
    op.create_table(
        'game_assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('asset_type', sa.String(100), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('storage_url', sa.String(500), nullable=True),
        sa.Column('local_path', sa.String(500), nullable=True),
        sa.Column('ai_prompt', sa.Text, nullable=True),
        sa.Column('ai_model', sa.String(100), nullable=True),
        sa.Column('width', sa.Integer, nullable=True),
        sa.Column('height', sa.Integer, nullable=True),
        sa.Column('format', sa.String(50), nullable=True),
        sa.Column('metadata', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_game_assets_game_id', 'game_assets', ['game_id'])
    op.create_index('idx_game_assets_type', 'game_assets', ['asset_type'])

    # Game builds table
    op.create_table(
        'game_builds',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('build_number', sa.Integer, nullable=False),
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        sa.Column('platform', sa.String(50), nullable=False, default='android'),
        sa.Column('build_type', sa.String(50), nullable=False, default='debug'),
        sa.Column('artifact_url', sa.String(500), nullable=True),
        sa.Column('logs_url', sa.String(500), nullable=True),
        sa.Column('github_run_id', sa.BigInteger, nullable=True),
        sa.Column('github_workflow', sa.String(255), nullable=True),
        sa.Column('version_name', sa.String(50), nullable=True),
        sa.Column('version_code', sa.Integer, nullable=True),
        sa.Column('file_size_bytes', sa.BigInteger, nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_game_builds_game_id', 'game_builds', ['game_id'])
    op.create_index('idx_game_builds_status', 'game_builds', ['status'])

    # Analytics events table
    op.create_table(
        'analytics_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=True),
        sa.Column('session_id', sa.String(255), nullable=True),
        sa.Column('level', sa.Integer, nullable=True),
        sa.Column('properties', postgresql.JSON, nullable=True),
        sa.Column('device_info', postgresql.JSON, nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_analytics_events_game_id', 'analytics_events', ['game_id'])
    op.create_index('idx_analytics_events_type', 'analytics_events', ['event_type'])
    op.create_index('idx_analytics_events_timestamp', 'analytics_events', ['timestamp'])

    # Game metrics table
    op.create_table(
        'game_metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('installs', sa.Integer, default=0),
        sa.Column('dau', sa.Integer, default=0),
        sa.Column('sessions', sa.Integer, default=0),
        sa.Column('avg_session_duration_seconds', sa.Integer, default=0),
        sa.Column('retention_d1', sa.Numeric(5, 4), default=0),
        sa.Column('retention_d7', sa.Numeric(5, 4), default=0),
        sa.Column('retention_d30', sa.Numeric(5, 4), default=0),
        sa.Column('levels_completed', sa.Integer, default=0),
        sa.Column('levels_failed', sa.Integer, default=0),
        sa.Column('ad_impressions', sa.Integer, default=0),
        sa.Column('ad_revenue_cents', sa.Integer, default=0),
        sa.Column('iap_revenue_cents', sa.Integer, default=0),
        sa.Column('score', sa.Numeric(10, 4), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('game_id', 'date', name='unique_game_date'),
    )
    op.create_index('idx_game_metrics_game_id', 'game_metrics', ['game_id'])
    op.create_index('idx_game_metrics_date', 'game_metrics', ['date'])
    op.create_index('idx_game_metrics_score', 'game_metrics', ['score'])

    # Learning weights table
    op.create_table(
        'learning_weights',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('mechanic_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('mechanics.id', ondelete='CASCADE'), nullable=False),
        sa.Column('genre', sa.String(100), nullable=False),
        sa.Column('weight', sa.Numeric(5, 4), nullable=False, default=1.0),
        sa.Column('sample_count', sa.Integer, nullable=False, default=0),
        sa.Column('avg_retention_d7', sa.Numeric(5, 4), default=0),
        sa.Column('avg_completion_rate', sa.Numeric(5, 4), default=0),
        sa.Column('avg_ad_opt_in_rate', sa.Numeric(5, 4), default=0),
        sa.Column('last_updated', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('mechanic_id', 'genre', name='unique_mechanic_genre'),
    )
    op.create_index('idx_learning_weights_mechanic', 'learning_weights', ['mechanic_id'])
    op.create_index('idx_learning_weights_genre', 'learning_weights', ['genre'])

    # Generation logs table
    op.create_table(
        'generation_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('batches.id', ondelete='SET NULL'), nullable=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='SET NULL'), nullable=True),
        sa.Column('step_number', sa.Integer, nullable=True),
        sa.Column('log_level', sa.String(20), nullable=False, default='info'),
        sa.Column('log_type', sa.String(100), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('metadata', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_generation_logs_batch', 'generation_logs', ['batch_id'])
    op.create_index('idx_generation_logs_game', 'generation_logs', ['game_id'])
    op.create_index('idx_generation_logs_created', 'generation_logs', ['created_at'])


def downgrade() -> None:
    op.drop_table('generation_logs')
    op.drop_table('learning_weights')
    op.drop_table('game_metrics')
    op.drop_table('analytics_events')
    op.drop_table('game_builds')
    op.drop_table('game_assets')
    op.drop_table('mechanics')
    op.drop_table('game_steps')
    op.drop_table('games')
    op.drop_table('batches')
