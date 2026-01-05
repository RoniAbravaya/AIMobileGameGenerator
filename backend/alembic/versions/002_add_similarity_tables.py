"""Add similarity check tables

Revision ID: 002
Revises: 001
Create Date: 2025-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Similarity checks table
    op.create_table(
        'similarity_checks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_similar', sa.Boolean, nullable=False),
        sa.Column('similarity_score', sa.Float, nullable=False),
        sa.Column('most_similar_game_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('breakdown', postgresql.JSON, nullable=True),
        sa.Column('attempt_number', sa.Integer, nullable=False, default=1),
        sa.Column('triggered_regeneration', sa.Boolean, default=False),
        sa.Column('rejected_gdd', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_similarity_checks_game_id', 'similarity_checks', ['game_id'])
    op.create_index('idx_similarity_checks_is_similar', 'similarity_checks', ['is_similar'])

    # Regeneration logs table
    op.create_table(
        'regeneration_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('batches.id', ondelete='SET NULL'), nullable=True),
        sa.Column('attempt_number', sa.Integer, nullable=False),
        sa.Column('reason', sa.String(100), nullable=False),
        sa.Column('similarity_score', sa.Float, nullable=False),
        sa.Column('similar_to_game_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('constraints_applied', postgresql.JSON, nullable=True),
        sa.Column('success', sa.Boolean, default=False),
        sa.Column('final_similarity_score', sa.Float, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_regeneration_logs_game_id', 'regeneration_logs', ['game_id'])
    op.create_index('idx_regeneration_logs_batch_id', 'regeneration_logs', ['batch_id'])


def downgrade() -> None:
    op.drop_table('regeneration_logs')
    op.drop_table('similarity_checks')
