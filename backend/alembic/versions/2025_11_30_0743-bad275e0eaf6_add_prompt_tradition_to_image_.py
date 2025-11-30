"""Add prompt_tradition to image_collections

Revision ID: bad275e0eaf6
Revises: 299a5dfbba6a
Create Date: 2025-11-30 07:43:17.957733

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "bad275e0eaf6"
down_revision: Union[str, None] = "299a5dfbba6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add prompt_tradition column to image_collections table."""
    op.add_column(
        "image_collections",
        sa.Column(
            "prompt_tradition",
            sa.String(length=50),
            nullable=True,
            comment="Prompt tradition used: rws, thoth, marseille, astronomical, mythological, custom",
        ),
    )


def downgrade() -> None:
    """Remove prompt_tradition column from image_collections table."""
    op.drop_column("image_collections", "prompt_tradition")
