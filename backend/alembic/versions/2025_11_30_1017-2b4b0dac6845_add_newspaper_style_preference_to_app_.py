"""Add newspaper_style preference to app_config

Revision ID: 2b4b0dac6845
Revises: 80aadb3e1c5c
Create Date: 2025-11-30 10:17:21.629801

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2b4b0dac6845"
down_revision: Union[str, None] = "80aadb3e1c5c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add newspaper_style column to app_config with server default for SQLite compatibility
    op.add_column(
        "app_config",
        sa.Column(
            "newspaper_style",
            sa.String(),
            nullable=False,
            server_default='modern',
            comment="Preferred newspaper style for Timeline feature: 'victorian' or 'modern'",
        ),
    )


def downgrade() -> None:
    op.drop_column("app_config", "newspaper_style")
