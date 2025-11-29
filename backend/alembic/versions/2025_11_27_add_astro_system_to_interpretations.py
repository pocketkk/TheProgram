"""Add astro_system column to chart_interpretations

Adds astro_system column to separate Western vs Vedic interpretations.
Backfills existing interpretations with astro_system from parent chart.

Revision ID: a1b2c3d4e5f6
Revises: 93d218e8012f
Create Date: 2025-11-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "93d218e8012f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add astro_system column with default value
    op.add_column(
        'chart_interpretations',
        sa.Column('astro_system', sa.String(length=50), nullable=False, server_default='western')
    )

    # Backfill astro_system from parent chart
    # This updates existing interpretations to use the astro_system from their associated chart
    op.execute("""
        UPDATE chart_interpretations
        SET astro_system = (
            SELECT charts.astro_system
            FROM charts
            WHERE charts.id = chart_interpretations.chart_id
        )
        WHERE EXISTS (
            SELECT 1 FROM charts WHERE charts.id = chart_interpretations.chart_id
        )
    """)

    # Create index on astro_system for efficient filtering
    op.create_index(
        'ix_chart_interpretations_astro_system',
        'chart_interpretations',
        ['astro_system'],
        unique=False
    )

    # Create new compound lookup index that includes astro_system
    op.create_index(
        'ix_chart_interp_lookup_v2',
        'chart_interpretations',
        ['chart_id', 'astro_system', 'element_type', 'element_key'],
        unique=False
    )


def downgrade() -> None:
    # Drop new indexes
    op.drop_index('ix_chart_interp_lookup_v2', table_name='chart_interpretations')
    op.drop_index('ix_chart_interpretations_astro_system', table_name='chart_interpretations')

    # Remove astro_system column
    op.drop_column('chart_interpretations', 'astro_system')
