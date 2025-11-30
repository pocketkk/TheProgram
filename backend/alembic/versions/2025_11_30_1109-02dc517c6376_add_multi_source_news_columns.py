"""Add multi-source news columns

Revision ID: 02dc517c6376
Revises: 2b4b0dac6845
Create Date: 2025-11-30 11:09:06.851341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "02dc517c6376"
down_revision: Union[str, None] = "2b4b0dac6845"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add news API key columns to app_config
    with op.batch_alter_table("app_config", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "guardian_api_key",
                sa.String(),
                nullable=True,
                comment="The Guardian API key for news content",
            )
        )
        batch_op.add_column(
            sa.Column(
                "nyt_api_key",
                sa.String(),
                nullable=True,
                comment="New York Times API key for Archive API",
            )
        )
        batch_op.add_column(
            sa.Column(
                "newsapi_api_key",
                sa.String(),
                nullable=True,
                comment="NewsAPI.org API key for recent news",
            )
        )
        batch_op.add_column(
            sa.Column(
                "newspaper_sources_priority",
                sa.String(),
                nullable=True,
                server_default="guardian,nyt,wikipedia",
                comment="Comma-separated priority order for news sources",
            )
        )

    # Add multi-source cache columns to historical_dates
    with op.batch_alter_table("historical_dates", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "full_date",
                sa.String(length=10),
                nullable=True,
                comment="Full date in YYYY-MM-DD format for year-specific news",
            )
        )
        batch_op.add_column(
            sa.Column(
                "guardian_articles",
                sa.Text(),
                nullable=True,
                comment="JSON list of articles from The Guardian API",
            )
        )
        batch_op.add_column(
            sa.Column(
                "guardian_fetched_at",
                sa.String(),
                nullable=True,
                comment="ISO timestamp of last Guardian API fetch",
            )
        )
        batch_op.add_column(
            sa.Column(
                "guardian_fetch_error",
                sa.Text(),
                nullable=True,
                comment="Error message if Guardian fetch failed",
            )
        )
        batch_op.add_column(
            sa.Column(
                "nyt_articles",
                sa.Text(),
                nullable=True,
                comment="JSON list of articles from NYT Archive/Search API",
            )
        )
        batch_op.add_column(
            sa.Column(
                "nyt_fetched_at",
                sa.String(),
                nullable=True,
                comment="ISO timestamp of last NYT API fetch",
            )
        )
        batch_op.add_column(
            sa.Column(
                "nyt_fetch_error",
                sa.Text(),
                nullable=True,
                comment="Error message if NYT fetch failed",
            )
        )
        batch_op.add_column(
            sa.Column(
                "newspaper_sources",
                sa.String(),
                nullable=True,
                comment="Comma-separated list of sources used",
            )
        )
        batch_op.create_index("idx_historical_date_full_date", ["full_date"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("historical_dates", schema=None) as batch_op:
        batch_op.drop_index("idx_historical_date_full_date")
        batch_op.drop_column("newspaper_sources")
        batch_op.drop_column("nyt_fetch_error")
        batch_op.drop_column("nyt_fetched_at")
        batch_op.drop_column("nyt_articles")
        batch_op.drop_column("guardian_fetch_error")
        batch_op.drop_column("guardian_fetched_at")
        batch_op.drop_column("guardian_articles")
        batch_op.drop_column("full_date")

    with op.batch_alter_table("app_config", schema=None) as batch_op:
        batch_op.drop_column("newspaper_sources_priority")
        batch_op.drop_column("newsapi_api_key")
        batch_op.drop_column("nyt_api_key")
        batch_op.drop_column("guardian_api_key")
