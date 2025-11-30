"""Add image_collections and generated_images tables

Revision ID: dfc575dfa867
Revises: a1b2c3d4e5f6
Create Date: 2025-11-29 14:12:32.001172

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "dfc575dfa867"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create image_collections table
    op.create_table(
        "image_collections",
        sa.Column("name", sa.String(length=255), nullable=False, comment="Collection name"),
        sa.Column(
            "collection_type",
            sa.String(length=50),
            nullable=False,
            comment="Collection type: tarot_deck, theme_set",
        ),
        sa.Column("description", sa.Text(), nullable=True, comment="Collection description"),
        sa.Column(
            "style_prompt", sa.Text(), nullable=True, comment="Base style prompt for consistency"
        ),
        sa.Column(
            "is_complete",
            sa.Boolean(),
            nullable=False,
            comment="Whether all expected images are generated",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            comment="Whether this collection is currently active",
        ),
        sa.Column(
            "total_expected",
            sa.Integer(),
            nullable=True,
            comment="Expected number of images (78 for tarot)",
        ),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_collection_active", "image_collections", ["is_active"], unique=False)
    op.create_index("idx_collection_created", "image_collections", ["created_at"], unique=False)
    op.create_index("idx_collection_type", "image_collections", ["collection_type"], unique=False)

    # Create generated_images table
    op.create_table(
        "generated_images",
        sa.Column(
            "image_type",
            sa.String(length=50),
            nullable=False,
            comment="Image type: tarot_card, background, infographic, custom",
        ),
        sa.Column("prompt", sa.Text(), nullable=False, comment="Generation prompt"),
        sa.Column(
            "style_prompt", sa.String(length=500), nullable=True, comment="Style instructions"
        ),
        sa.Column(
            "file_path",
            sa.String(length=500),
            nullable=False,
            comment="Relative path from images directory",
        ),
        sa.Column(
            "thumbnail_path",
            sa.String(length=500),
            nullable=True,
            comment="Relative path to thumbnail",
        ),
        sa.Column("width", sa.Integer(), nullable=True, comment="Width in pixels"),
        sa.Column("height", sa.Integer(), nullable=True, comment="Height in pixels"),
        sa.Column("mime_type", sa.String(length=50), nullable=False, comment="MIME type"),
        sa.Column("file_size", sa.Integer(), nullable=True, comment="File size in bytes"),
        sa.Column(
            "generation_params",
            sa.Text(),
            nullable=True,
            comment="JSON generation parameters (aspect_ratio, model, etc.)",
        ),
        sa.Column(
            "model_used",
            sa.String(length=100),
            nullable=True,
            comment="Gemini model used for generation",
        ),
        sa.Column(
            "parent_id",
            sa.String(),
            nullable=True,
            comment="For refinements, links to original image",
        ),
        sa.Column("collection_id", sa.String(), nullable=True, comment="Parent collection"),
        sa.Column(
            "item_key",
            sa.String(length=100),
            nullable=True,
            comment="Identifier within collection (e.g., major_00 for The Fool)",
        ),
        sa.Column("is_approved", sa.Boolean(), nullable=False, comment="User approval status"),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["collection_id"], ["image_collections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["generated_images.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_path"),
    )
    op.create_index("idx_image_collection", "generated_images", ["collection_id"], unique=False)
    op.create_index(
        "idx_image_collection_item", "generated_images", ["collection_id", "item_key"], unique=False
    )
    op.create_index("idx_image_created", "generated_images", ["created_at"], unique=False)
    op.create_index("idx_image_item_key", "generated_images", ["item_key"], unique=False)
    op.create_index("idx_image_type", "generated_images", ["image_type"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_image_type", table_name="generated_images")
    op.drop_index("idx_image_item_key", table_name="generated_images")
    op.drop_index("idx_image_created", table_name="generated_images")
    op.drop_index("idx_image_collection_item", table_name="generated_images")
    op.drop_index("idx_image_collection", table_name="generated_images")
    op.drop_table("generated_images")
    op.drop_index("idx_collection_type", table_name="image_collections")
    op.drop_index("idx_collection_created", table_name="image_collections")
    op.drop_index("idx_collection_active", table_name="image_collections")
    op.drop_table("image_collections")
