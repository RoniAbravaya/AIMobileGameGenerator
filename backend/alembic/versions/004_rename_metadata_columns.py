"""Rename metadata columns to avoid SQLAlchemy reserved word conflict

Revision ID: 004
Revises: 003
Create Date: 2026-01-05

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename metadata column in game_assets table
    op.alter_column('game_assets', 'metadata', new_column_name='asset_metadata')
    
    # Rename metadata column in generation_logs table
    op.alter_column('generation_logs', 'metadata', new_column_name='log_metadata')


def downgrade() -> None:
    # Revert column names
    op.alter_column('game_assets', 'asset_metadata', new_column_name='metadata')
    op.alter_column('generation_logs', 'log_metadata', new_column_name='metadata')

