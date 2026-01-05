"""
Change genre_tags column from JSON to JSONB

This migration changes the genre_tags column in the mechanics table from JSON to JSONB
to enable proper containment queries using the @> operator.

Revision ID: 005
Revises: 004
Create Date: 2026-01-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade genre_tags from JSON to JSONB."""
    # PostgreSQL allows direct casting from JSON to JSONB
    op.execute(
        """
        ALTER TABLE mechanics 
        ALTER COLUMN genre_tags 
        TYPE JSONB 
        USING genre_tags::jsonb
        """
    )


def downgrade() -> None:
    """Downgrade genre_tags from JSONB back to JSON."""
    op.execute(
        """
        ALTER TABLE mechanics 
        ALTER COLUMN genre_tags 
        TYPE JSON 
        USING genre_tags::json
        """
    )

