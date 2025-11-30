"""Add google_api_key to app_config

Revision ID: 0ede90533721
Revises: dfc575dfa867
Create Date: 2025-11-29 15:11:39.512303

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0ede90533721"
down_revision: Union[str, None] = "dfc575dfa867"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add google_api_key column to app_config
    op.add_column(
        "app_config",
        sa.Column(
            "google_api_key",
            sa.String(),
            nullable=True,
            comment="Google API key for Gemini image generation",
        ),
    )


def downgrade() -> None:
    op.drop_column("app_config", "google_api_key")
