"""Add border_style to image_collections

Revision ID: 299a5dfbba6a
Revises: b3ec68a62019
Create Date: 2025-11-29 18:22:05.310469

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "299a5dfbba6a"
down_revision: Union[str, None] = "b3ec68a62019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add border_style column to image_collections
    op.add_column(
        "image_collections",
        sa.Column(
            "border_style",
            sa.Text(),
            nullable=True,
            comment="Border/frame style description for card edges and text",
        ),
    )


def downgrade() -> None:
    op.drop_column("image_collections", "border_style")
