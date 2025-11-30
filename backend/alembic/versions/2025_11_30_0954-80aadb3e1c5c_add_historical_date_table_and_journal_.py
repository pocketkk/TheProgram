"""Add historical_date table and journal target_date

Revision ID: 80aadb3e1c5c
Revises: bad275e0eaf6
Create Date: 2025-11-30 09:54:07.738906

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.core.json_helpers import JSONEncodedDict, JSONEncodedList


# revision identifiers, used by Alembic.
revision: str = "80aadb3e1c5c"
down_revision: Union[str, None] = "bad275e0eaf6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create historical_dates table
    op.create_table(
        "historical_dates",
        sa.Column(
            "month_day",
            sa.String(length=5),
            nullable=False,
            comment="Cache key in MM-DD format (e.g., '07-20')",
        ),
        sa.Column(
            "wikipedia_events",
            JSONEncodedList(),
            nullable=True,
            comment="JSON list of historical events from Wikipedia",
        ),
        sa.Column(
            "wikipedia_births",
            JSONEncodedList(),
            nullable=True,
            comment="JSON list of notable births from Wikipedia",
        ),
        sa.Column(
            "wikipedia_deaths",
            JSONEncodedList(),
            nullable=True,
            comment="JSON list of notable deaths from Wikipedia",
        ),
        sa.Column(
            "wikipedia_holidays",
            JSONEncodedList(),
            nullable=True,
            comment="JSON list of holidays/observances from Wikipedia",
        ),
        sa.Column(
            "wikipedia_fetched_at",
            sa.String(),
            nullable=True,
            comment="ISO timestamp of last Wikipedia fetch",
        ),
        sa.Column(
            "wikipedia_fetch_error",
            sa.Text(),
            nullable=True,
            comment="Error message if Wikipedia fetch failed",
        ),
        sa.Column(
            "newspaper_content",
            JSONEncodedDict(),
            nullable=True,
            comment="JSON structured newspaper with headline, sections, articles",
        ),
        sa.Column(
            "newspaper_style",
            sa.String(length=50),
            nullable=True,
            comment="Style used for generation: 'victorian', 'modern'",
        ),
        sa.Column(
            "newspaper_generated_at",
            sa.String(),
            nullable=True,
            comment="ISO timestamp of newspaper generation",
        ),
        sa.Column(
            "generation_prompt_hash",
            sa.String(length=64),
            nullable=True,
            comment="Hash of generation prompt for cache invalidation",
        ),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for historical_dates
    op.create_index(
        "idx_historical_date_month_day", "historical_dates", ["month_day"], unique=False
    )
    op.create_index(
        op.f("ix_historical_dates_month_day"), "historical_dates", ["month_day"], unique=True
    )

    # Add target_date column to journal_entries with batch mode for SQLite
    with op.batch_alter_table("journal_entries") as batch_op:
        batch_op.add_column(
            sa.Column(
                "target_date",
                sa.String(length=10),
                nullable=True,
                comment="Target date for timeline linking (YYYY-MM-DD). Null for regular journal entries.",
            )
        )
        batch_op.create_index("idx_journal_target_date", ["target_date"], unique=False)


def downgrade() -> None:
    # Remove target_date from journal_entries with batch mode for SQLite
    with op.batch_alter_table("journal_entries") as batch_op:
        batch_op.drop_index("idx_journal_target_date")
        batch_op.drop_column("target_date")

    # Drop historical_dates table
    op.drop_index(op.f("ix_historical_dates_month_day"), table_name="historical_dates")
    op.drop_index("idx_historical_date_month_day", table_name="historical_dates")
    op.drop_table("historical_dates")
