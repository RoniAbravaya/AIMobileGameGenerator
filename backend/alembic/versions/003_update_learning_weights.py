"""Update learning_weights table

Add mechanic_name column and make mechanic_id nullable.
This allows storing weights by mechanic name (including genre weights).

Revision ID: 003
Revises: 002
Create Date: 2026-01-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add mechanic_name column
    op.add_column(
        "learning_weights",
        sa.Column("mechanic_name", sa.String(255), nullable=True),
    )
    
    # Make mechanic_id nullable
    op.alter_column(
        "learning_weights",
        "mechanic_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    
    # Populate mechanic_name from existing mechanics
    op.execute("""
        UPDATE learning_weights lw
        SET mechanic_name = m.name
        FROM mechanics m
        WHERE lw.mechanic_id = m.id
        AND lw.mechanic_name IS NULL
    """)
    
    # For any remaining rows without mechanic_name, use a default
    op.execute("""
        UPDATE learning_weights
        SET mechanic_name = COALESCE(mechanic_name, 'unknown_' || id::text)
        WHERE mechanic_name IS NULL
    """)
    
    # Now make mechanic_name NOT NULL
    op.alter_column(
        "learning_weights",
        "mechanic_name",
        existing_type=sa.String(255),
        nullable=False,
    )
    
    # Drop old unique constraint
    op.drop_constraint("unique_mechanic_genre", "learning_weights", type_="unique")
    
    # Add new unique constraint on mechanic_name + genre
    op.create_unique_constraint(
        "unique_mechanic_name_genre",
        "learning_weights",
        ["mechanic_name", "genre"],
    )
    
    # Add index on mechanic_name
    op.create_index(
        "ix_learning_weights_mechanic_name",
        "learning_weights",
        ["mechanic_name"],
    )


def downgrade() -> None:
    # Drop new index
    op.drop_index("ix_learning_weights_mechanic_name", "learning_weights")
    
    # Drop new unique constraint
    op.drop_constraint("unique_mechanic_name_genre", "learning_weights", type_="unique")
    
    # Restore old unique constraint
    op.create_unique_constraint(
        "unique_mechanic_genre",
        "learning_weights",
        ["mechanic_id", "genre"],
    )
    
    # Make mechanic_id NOT NULL again
    op.alter_column(
        "learning_weights",
        "mechanic_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    
    # Drop mechanic_name column
    op.drop_column("learning_weights", "mechanic_name")
