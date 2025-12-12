"""Add meditation tables

Revision ID: 001_meditation
Revises:
Create Date: 2024-12-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_meditation'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create meditation tables"""
    # Create meditation_presets table
    op.create_table(
        'meditation_presets',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, default=10),
        sa.Column('interval_bell_minutes', sa.Integer(), nullable=True),
        sa.Column('warm_up_seconds', sa.Integer(), nullable=False, default=0),
        sa.Column('cool_down_seconds', sa.Integer(), nullable=False, default=0),
        sa.Column('music_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('music_style', sa.String(50), nullable=True, default='ambient'),
        sa.Column('music_mood', sa.String(50), nullable=True, default='calming'),
        sa.Column('binaural_frequency', sa.Float(), nullable=True),
        sa.Column('visualization_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('visualization_type', sa.String(50), nullable=True, default='waveform'),
        sa.Column('visualization_intensity', sa.Float(), nullable=False, default=0.5),
        sa.Column('is_favorite', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('times_used', sa.Integer(), nullable=False, default=0),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create meditation_sessions table
    op.create_table(
        'meditation_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('preset_id', sa.String(36), sa.ForeignKey('meditation_presets.id', ondelete='SET NULL'), nullable=True),
        sa.Column('preset_name', sa.String(100), nullable=True),
        sa.Column('planned_duration_minutes', sa.Integer(), nullable=False),
        sa.Column('actual_duration_seconds', sa.Integer(), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False, default=False),
        sa.Column('mood_before', sa.String(50), nullable=True),
        sa.Column('mood_after', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('session_date', sa.String(10), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create generated_meditation_audio table
    op.create_table(
        'generated_meditation_audio',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('preset_id', sa.String(36), sa.ForeignKey('meditation_presets.id', ondelete='CASCADE'), nullable=True),
        sa.Column('audio_id', sa.String(100), nullable=False, unique=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('mime_type', sa.String(50), nullable=False, default='audio/wav'),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, default=0),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('style', sa.String(50), nullable=True),
        sa.Column('mood', sa.String(50), nullable=True),
        sa.Column('prompt', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes
    op.create_index('ix_meditation_presets_name', 'meditation_presets', ['name'])
    op.create_index('ix_meditation_presets_is_favorite', 'meditation_presets', ['is_favorite'])
    op.create_index('ix_meditation_sessions_session_date', 'meditation_sessions', ['session_date'])
    op.create_index('ix_meditation_sessions_preset_id', 'meditation_sessions', ['preset_id'])
    op.create_index('ix_generated_meditation_audio_audio_id', 'generated_meditation_audio', ['audio_id'])


def downgrade() -> None:
    """Drop meditation tables"""
    # Drop indexes first
    op.drop_index('ix_generated_meditation_audio_audio_id')
    op.drop_index('ix_meditation_sessions_preset_id')
    op.drop_index('ix_meditation_sessions_session_date')
    op.drop_index('ix_meditation_presets_is_favorite')
    op.drop_index('ix_meditation_presets_name')

    # Drop tables
    op.drop_table('generated_meditation_audio')
    op.drop_table('meditation_sessions')
    op.drop_table('meditation_presets')
