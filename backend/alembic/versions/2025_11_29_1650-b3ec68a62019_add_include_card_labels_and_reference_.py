"""Add include_card_labels and reference_image_id to image_collections

Revision ID: b3ec68a62019
Revises: 0ede90533721
Create Date: 2025-11-29 16:50:04.304249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3ec68a62019"
down_revision: Union[str, None] = "0ede90533721"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add include_card_labels column with default False
    op.add_column(
        "image_collections",
        sa.Column(
            "include_card_labels",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
            comment="Whether to include card name/number on generated cards",
        ),
    )
    # Add reference_image_id column
    op.add_column(
        "image_collections",
        sa.Column(
            "reference_image_id",
            sa.String(),
            nullable=True,
            comment="Approved reference image for style consistency",
        ),
    )
    # Note: SQLite doesn't support adding foreign keys to existing tables,
    # so we skip the FK constraint. The relationship is enforced at the ORM level.


def downgrade() -> None:
    op.drop_column("image_collections", "reference_image_id")
    op.drop_column("image_collections", "include_card_labels")
